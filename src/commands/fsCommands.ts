import { CommandExecutor } from '../command';
import { PotatoFS, PotatoFSDir, PotatoFSFile } from '../PotatoFS';

export const FS_COMMANDS: Record<string, CommandExecutor> = {
    cat: {
        shortDescription: 'Show contents of a text file',
        invoke: context => {
            const { args, fs, cli } = context;
            const node = fs.get(args.trim());

            if (PotatoFS.isFile(node)) {
                const str = new TextDecoder().decode(node.buffer);
                cli.println(str);
                return 0;
            }

            cli.printerr(`${node.name} is not a file.`);
            return 1;
        }
    },
    cd: {
        shortDescription: 'Change current working directory',
        invoke: context => {
            const { args, fs } = context;
            fs.cd(args.trim());
            return 0;
        }
    },
    pwd: {
        shortDescription: 'Print current working directory',
        invoke: context => {
            const { cli, fs } = context;
            cli.println(fs.cwd());
            return 0;
        }
    },
    ls: {
        shortDescription: 'List files and folders',
        invoke: context => {
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
        invoke: context => {
            const { args, fs } = context;
            fs.mkdirp(args.trim());
            return 0;
        }
    },
    upload: {
        shortDescription: 'Upload a file to the current directory',
        invoke: context => {
            const { fs, cli, env } = context;
            const tab = env.getString('TAB');

            const input: HTMLInputElement = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.addEventListener('change', () => {
                const files = Array.prototype.slice.call(input.files);
                cli.println(`Uploading ${files.length} file(s).`);

                files.forEach(file => {
                    cli.println(`${file.name} (${file.size} bytes)`);

                    const reader = new FileReader();
                    reader.onload = e => { 
                        const cwd = fs.get(fs.cwd()) as PotatoFSDir;
                        const fsnode: PotatoFSFile = {
                            name: file.name,
                            parent: cwd,
                            buffer: e.target!.result as ArrayBuffer
                        };
                        cwd.children.push(fsnode);

                        cli.println(`${file.name} uploaded to ${fs.cwd()}`);
                    };
                    reader.readAsArrayBuffer(file);
                });
                
            });
            input.click();

            return 0;
        }
    }
};
