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
        // TODO: make smarter, check for relative paths, dots, etc. Check first part for relative
        return parts.join(SEPARATOR).replace(/\/\//g, SEPARATOR);
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
                throw new Error(`Unexpected non-parent node "${node.name}"`);
            }
            const name = segments.shift();
            const found = node.children.find(child => child.name === name);
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
                throw new Error(`Unexpected non-parent node "${node.name}"`);
            }
            const name = segments.shift();
            const found = node.children.find(child => child.name === name);
            if (found) {
                node = found;
            }
            else {
                const created = {
                    name: name,
                    parent: node,
                    children: [],
                };
                node.children.push(created);
                node = created;
            }
        }
        return node;
    }
    list(path) {
        const node = this.get(path);
        if (PotatoFS.isDir(node)) {
            return node.children.slice();
        }
        else {
            return [node];
        }
    }
}
