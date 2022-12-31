import { CommandExecutor } from '../command';
import { PotatoFS, PotatoFSDir, PotatoFSFile } from '../PotatoFS';

export const FS_COMMANDS: Record<string, CommandExecutor> = {
    cat: {
        shortDescription: 'Show contents of a text file',
        help: [
            'Usage:',
            '  cat [file path]',
            '',
            'Dumps the contents of a text file to the screen.'
        ].join('\n'),
        invoke: async context => {
            const { args, fs, cli } = context;
            
            const node = fs.get(args.trim());
            if (!PotatoFS.isFile(node)) {
                cli.printerr(`"${node.name}" is not a file.`);
                return 1;
            }

            return PotatoFS.getText(node)
                .then(text => cli.println(text))
                .then(() => 0);
        }
    },
    cd: {
        shortDescription: 'Change current working directory',
        help: [
            'Usage:',
            '  cd [path]',
            '',
            'Change the current working directory.'
        ].join('\n'),
        invoke: async context => {
            const { args, fs } = context;
            fs.cd(args.trim());
            return 0;
        }
    },
    download: {
        shortDescription: 'Download a file to your computer',
        help: [
            'Usage:',
            '  download [file or path]',
            '',
            'Allows you to download files from PotatoFS to your computer.',
        ].join('\n'),
        invoke: async context => {
            const { args, fs, cli } = context;
            const node = fs.get(args.trim());

            if (!PotatoFS.isFile(node)) {
                cli.printerr(`"${node.name}" is not a file.`);
                return 1;
            }

            cli.println('Preparing your download, just a sec.');

            return PotatoFS.getDataURL(node)
                .then(url => {
                    const a: HTMLAnchorElement = document.createElement('a');
                    a.href = url;
                    a.download = node.name;
                    a.click();
                })
                .then(() => 0);
        }
    },
    ls: {
        shortDescription: 'List files and folders',
        help: [
            'Usage:',
            '  ls [path?]',
            '',
            'List contents of path, or the current working directory if no path provided.'
        ].join('\n'),
        invoke: async context => {
            const { cli, args, fs, env } = context;
            const nodes = fs.list(args.trim());
    
            nodes.forEach(node => {
                cli.println(node.name);
            });
    
            return 0;
        }
    },
    mkdirp: {
        shortDescription: 'Create directories',
        help: [
            'Usage:',
            '  mkdirp [path]',
            '',
            'Create the provided path if it does not exist.'
        ].join('\n'),
        invoke: async context => {
            const { args, fs } = context;
            fs.mkdirp(args.trim());
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
    rm: {
        shortDescription: 'Remove a file',
        invoke: async context => {
            const { args, fs, cli } = context;
            const node = fs.get(args.trim());

            if (PotatoFS.isFile(node)) {
                const i = node.parent!.children.findIndex(n => n === node);
                if (i !== -1) {
                    node.parent!.children.splice(i, 1);
                } else {
                    // wtf
                    cli.printerr(`Internal error.`);
                    return 1;
                }
            } else {
                cli.printerr(`${node.name} is not a file.`);
                return 1;
            }

            return 0;
        }
    },
    upload: {
        shortDescription: 'Upload a file to the current directory',
        help: [
            'Usage:',
            '  upload',
            '',
            'Allows you to upload files to PotatoFS from your computer.',
            'Files are uploaded to the current directory.'
        ].join('\n'),
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
