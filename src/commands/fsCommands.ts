import { CommandExecutor } from '../command';
import { PotatoFS, PotatoFSDir, PotatoFSFile } from '../PotatoFS';

export const FS_COMMANDS: Record<string, CommandExecutor> = {
    cat: {
        shortDescription: 'Show contents of a text file',
        invoke: async context => {
            const { args, fs, cli } = context;
            
            return new Promise(resolve => {
                const node = fs.get(args.trim());

                if (PotatoFS.isFile(node)) {
                    const reader = new FileReader();
                    reader.onload = e => {
                        cli.println(e.target!.result);
                        resolve(0);
                    };
                    reader.readAsText(node.blob);
                } else {
                    cli.printerr(`"${node.name}" is not a file.`);
                    resolve(1);
                }
            });
        }
    },
    download: {
        shortDescription: 'Download a file to your computer',
        invoke: async context => {
            const { args, fs, cli } = context;
            const node = fs.get(args.trim());

            if (PotatoFS.isFile(node)) {
                cli.println('Preparing your download, just a sec.');

                const reader = new FileReader();
                reader.onload = e => {
                    const a: HTMLAnchorElement = document.createElement('a');
                    a.href = e.target!.result as string;
                    a.download = node.name;
                    a.click();
                };
                reader.readAsDataURL(node.blob);

                return 0;
            }

            cli.printerr(`"${node.name}" is not a file.`);
            return 1;
        }
    },
    cd: {
        shortDescription: 'Change current working directory',
        invoke: async context => {
            const { args, fs } = context;
            fs.cd(args.trim());
            return 0;
        }
    },
    pwd: {
        shortDescription: 'Print current working directory',
        invoke: async context => {
            const { cli, fs } = context;
            cli.println(fs.cwd());
            return 0;
        }
    },
    ls: {
        shortDescription: 'List files and folders',
        invoke: async context => {
            const { cli, args, fs, env } = context;
            const nodes = fs.list(args.trim());
            const tab = env.getString('TAB');
    
            cli.println(`cwd: ${fs.cwd()}`);
            nodes.forEach(node => {
                cli.println(tab + node.name);
            });
    
            return 0;
        }
    },
    mkdirp: {
        shortDescription: 'Create directories',
        invoke: async context => {
            const { args, fs } = context;
            fs.mkdirp(args.trim());
            return 0;
        }
    },
    upload: {
        shortDescription: 'Upload a file to the current directory',
        invoke: async context => {
            const { fs, cli } = context;

            const input: HTMLInputElement = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.addEventListener('change', () => {
                const files = Array.prototype.slice.call(input.files);
                cli.println(`Uploading ${files.length} file(s).`);

                files.forEach(file => {
                    const cwd = fs.get(fs.cwd()) as PotatoFSDir;
                    const fsnode: PotatoFSFile = {
                        name: file.name,
                        parent: cwd,
                        blob: file
                    };
                    cwd.children.push(fsnode);

                    cli.println(`${file.name} (${file.size} bytes) uploaded to ${fs.cwd()}`);
                });
                
            });
            input.click();

            return 0;
        }
    }
};
