import { Environment } from './Environment';

export const CWD_ENV_VAR = 'CWD';

const SEPARATOR = '/';

export interface PotatoFSNode {
    name: string;
    parent?: PotatoFSDir;
}

export interface PotatoFSDir extends PotatoFSNode {
    children: PotatoFSNode[];
}

export interface PotatoFSFile extends PotatoFSNode {
    body: Blob;
}

export class PotatoFS {
    private readonly root: PotatoFSNode;
    private readonly environment: Environment;

    constructor(root: PotatoFSNode, environment: Environment) {
        this.root = root;
        this.environment = environment;
    }

    static isRelative(path: string) {
        return path.charAt(0) !== SEPARATOR;
    }

    static join(...parts: string[]): string {
        // TODO: make smarter, check for relative paths, dots, etc. Check first part for relative
        return parts.join(SEPARATOR).replace(/\/\//g, SEPARATOR);
    }

    static isDir(node: PotatoFSNode): node is PotatoFSDir {
        return node && node.hasOwnProperty('children');
    }

    static isFile(node: PotatoFSNode): node is PotatoFSFile {
        return node && node.hasOwnProperty('body');
    }

    static splitPath(path: string): string[] {
        const split = path.split(SEPARATOR);
        const hasTrailingEmpty = split[split.length - 1] === '';
        return hasTrailingEmpty ? split.slice(0, -1) : split;
    }

    resolve(path: string): string {
        const relative = PotatoFS.isRelative(path);
        const resolved = relative ? PotatoFS.join(this.cwd(), path) : path;
        
        if (resolved === '/') {
            return resolved;
        }

        const hasTrailingSlash = resolved.charAt(resolved.length - 1) === SEPARATOR;
        return hasTrailingSlash ? resolved.substring(0, resolved.length-1) : resolved;
    }

    cd(path: string) {
        // TODO: validate
        const resolved = this.resolve(path);
        this.environment.put(CWD_ENV_VAR, resolved);
    }

    cwd(): string {
        // TODO: ensure never blank
        return this.environment.getString(CWD_ENV_VAR);
    }

    list(path: string): PotatoFSNode[] {
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
            } else {
                throw new Error(`No node named "${name}" found in parent "${node.name}".`);
            }
        }

        if (PotatoFS.isDir(node)) {
            return node.children.slice();
        } else {
            return [node];
        }
    }
}
