import { Environment } from '../src/Environment';
import { CWD_ENV_VAR, PotatoFS, PotatoFSDir, PotatoFSFile, PotatoFSRoot } from '../src/PotatoFS';

describe('PotatoFS', () => {
    let env: Environment;
    let root: PotatoFSRoot;
    let fs: PotatoFS;
    
    beforeEach(() => {
        env = new Environment({
            [CWD_ENV_VAR]: '/home/sprout'
        });
        root = {
            name: '',
            children: [
                {
                    name: 'home',
                    children: [
                        {
                            name: 'spud',
                            children: [
                                {
                                    name: 'test.json',
                                    body: new Blob([
                                        JSON.stringify({ message: 'test' }, null, 2)
                                    ], {
                                        type: "application/json",
                                    })
                                } as PotatoFSFile
                            ]
                        } as PotatoFSDir,
                        {
                            name: 'sprout',
                            children: []
                        } as PotatoFSDir
                    ]
                } as PotatoFSDir,
                {
                    name: 'etc',
                    children: []
                } as PotatoFSDir
            ]
        };
        fs = new PotatoFS(root, env);
    });

    describe('isRelative', () => {
        it('is false when path starts with /', () => {
            expect(PotatoFS.isRelative('/home/foo')).toBe(false);
        });

        it('is true when path does NOT start with /', () => {
            expect(PotatoFS.isRelative('foo/bar')).toBe(true);
        });

        it('is true when path is empty', () => {
            expect(PotatoFS.isRelative('')).toBe(true);
        });
    });

    describe('resolve', () => {
        it('resolves absolute root', () => {
            expect(fs.resolve('/')).toBe('/');
        });

        it('removes trailing slashes', () => {
            expect(fs.resolve('/home/spud/')).toBe('/home/spud');
        });

        it('removes empty segments', () => {
            expect(fs.resolve('/home///spud')).toBe('/home/spud');
        });

        it('removes single dots', () => {
            expect(fs.resolve('/home/././spud')).toBe('/home/spud');
        });

        it('resolves single leading dots', () => {
            fs.cd('/home')
            expect(fs.resolve('./sprout')).toBe('/home/sprout');
        });

        it('resolves double dots', () => {
            expect(fs.resolve('/home/spud/../sprout')).toBe('/home/sprout');
        });
    });

    describe('splitPath', () => {
        it('removes trailing empty from root', () => {
            expect(PotatoFS.splitPath('/')).toMatchObject(['']);
        })

        it('removes trailing empty from others', () => {
            expect(PotatoFS.splitPath('/home/foo/')).toMatchObject(['', 'home', 'foo']);
        })
    });

    describe('getAbsolutePath', () => {
        it('returns abs path string', () => {
            const path = '/test/getAbsolutePath/my/nested/dir';
            const node = fs.mkdirp('/test/getAbsolutePath/my/nested/dir');
            
            expect(PotatoFS.getAbsolutePath(node)).toBe(path);
        });
    });

    describe('mkdirp', () => {
        it('creates dirs', () => {
            const created = fs.mkdirp('/tmp/foo/bar');
            expect(created.name).toBe('bar');
            expect(created.parent!.name).toBe('foo');
            expect(created.parent!.parent!.name).toBe('tmp');

            expect(fs.list('/tmp/foo')[0].name).toBe('bar');
        });
    });

    describe('list', () => {
        it('should list root', () => {
            const actual = fs.list('/');
            
            expect(actual.map(node => node.name).join(', ')).toBe('home, etc');
        });

        it('should list dir contents of another dir', () => {
            const actual = fs.list('/home');
            
            expect(actual.map(node => node.name).join(', ')).toBe('spud, sprout');
        });

        it('should return named node if pointed to file', () => {
            const actual = fs.list('/home/spud/test.json');
            
            expect(actual.map(node => node.name).join(', ')).toBe('test.json');
        });

        it('should list relative paths', () => {
            // change dir
            fs.cd('/home/spud');
            
            const actual = fs.list('');
            
            expect(actual.map(node => node.name).join(', ')).toBe('test.json');
        });
    });
});