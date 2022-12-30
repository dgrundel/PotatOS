import { CommandExecutor } from '../command';

export const FS_COMMANDS: Record<string, CommandExecutor> = {
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
    }
};
