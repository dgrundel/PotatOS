export const CWD_ENV_VAR = 'CWD';
const SEPARATOR = '/';
export class PotatoFS {
    root;
    environment;
    constructor(root, environment) {
        this.root = root;
        this.environment = environment;
    }
    static isRelative(path) {
        return path.charAt(0) !== SEPARATOR;
    }
    static join(...parts) {
        return parts.join(SEPARATOR).replace(/\/+/g, SEPARATOR);
    }
    static extname(path) {
        const trimmed = path;
        const i = trimmed.lastIndexOf('.');
        return i === -1 ? '' : trimmed.substring(i);
    }
    static isDir(node) {
        return node && node.hasOwnProperty('children');
    }
    static isFile(node) {
        return node && node.hasOwnProperty('blob');
    }
    static splitPath(path) {
        const split = path.split(SEPARATOR);
        const hasTrailingEmpty = split[split.length - 1] === '';
        return hasTrailingEmpty ? split.slice(0, -1) : split;
    }
    static getAbsolutePath(node) {
        const stack = [];
        let n = node;
        while (n) {
            stack.push(n.name);
            n = n.parent;
        }
        return stack.reverse().join(SEPARATOR);
    }
    static async getText(node) {
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = e => {
                resolve(e.target.result);
            };
            reader.readAsText(node.blob);
        });
    }
    static async getDataURL(node) {
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = e => {
                resolve(e.target.result);
            };
            reader.readAsDataURL(node.blob);
        });
    }
    resolve(path) {
        const relative = PotatoFS.isRelative(path);
        const resolved = relative ? PotatoFS.join(this.cwd(), path) : path;
        const split = resolved.split(SEPARATOR);
        const stack = [];
        for (let i = 0; i < split.length; i++) {
            const segment = split[i];
            if (segment === '.' || segment === '') {
                continue;
            }
            if (segment === '..') {
                stack.pop();
                continue;
            }
            stack.push(segment);
        }
        return SEPARATOR + stack.join(SEPARATOR);
    }
    cd(path) {
        const resolved = this.resolve(path);
        const node = this.get(resolved);
        if (node) {
            this.environment.put(CWD_ENV_VAR, resolved);
        }
        else {
            throw new Error('Invalid path: ' + path);
        }
    }
    cwd() {
        return this.environment.getString(CWD_ENV_VAR);
    }
    get(path) {
        // e.g. '/foo/bar/baz.txt' or '/foo/qux'
        const resolved = this.resolve(path);
        // e.g. ['', 'foo', 'bar', 'baz.txt'] or ['', 'foo', 'qux']
        const segments = PotatoFS.splitPath(resolved);
        if (segments[0] !== '') {
            throw new Error(`Unexpected node value: ${segments[0]}`);
        }
        let node = this.root;
        segments.shift(); // remove root node
        while (segments.length > 0) {
            if (!PotatoFS.isDir(node)) {
                throw new Error(`Unexpected non-directory node "${node.name}"`);
            }
            const name = segments.shift();
            const found = name && node.children[name];
            if (found) {
                node = found;
            }
            else {
                throw new Error(`No node named "${name}" found in parent "${node.name}".`);
            }
        }
        return node;
    }
    mkdirp(path) {
        // e.g. '/foo/bar/baz.txt' or '/foo/qux'
        const resolved = this.resolve(path);
        // e.g. ['', 'foo', 'bar', 'baz.txt'] or ['', 'foo', 'qux']
        const segments = PotatoFS.splitPath(resolved);
        if (segments[0] !== '') {
            throw new Error(`Unexpected node value: ${segments[0]}`);
        }
        let node = this.root;
        segments.shift(); // remove root node
        while (segments.length > 0) {
            if (!PotatoFS.isDir(node)) {
                throw new Error(`Unexpected non-directory node "${node.name}"`);
            }
            const name = segments.shift();
            const found = name && node.children[name];
            if (found) {
                node = found;
            }
            else {
                const created = {
                    name: name,
                    parent: node,
                    children: {},
                };
                this.put(node, created);
                node = created;
            }
        }
        return node;
    }
    list(path) {
        const node = this.get(path);
        if (PotatoFS.isDir(node)) {
            return Object.values(node.children);
        }
        else {
            return [node];
        }
    }
    put(parent, child) {
        if (parent.children.hasOwnProperty(child.name)) {
            throw new Error(`${parent.name} already contains a file named ${child.name}`);
        }
        parent.children[child.name] = child;
    }
}
// lifted from: https://stackoverflow.com/a/30407959
export const dataURLtoBlob = (dataurl) => {
    var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1], bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
};
export const deserializeFS = (item, nodepath, parent, env) => {
    const node = {
        // make a copy, don't mutate original
        ...item,
        // expand env variables in names
        name: env.interpolate(item.name),
        parent,
    };
    if (PotatoFS.isDir(node)) {
        node.children = Object.keys(node.children).map(name => {
            const child = node.children[name];
            const childPath = PotatoFS.join(nodepath, name);
            return deserializeFS(child, childPath, node, env);
        }).reduce((map, child) => {
            map[child.name] = child;
            return map;
        }, {});
    }
    else if (PotatoFS.isFile(node)) {
        if (typeof node.blob === 'string') {
            node.blob = dataURLtoBlob(node.blob);
        }
    }
    else {
        throw new Error('Error initializing file system. Unknown node type: ' + JSON.stringify(node));
    }
    return node;
};
