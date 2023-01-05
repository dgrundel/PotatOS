import { Chunker, ChunkType } from './Chunker';
import { AliasExecutor } from './commands/alias';
import { EnvExecutor } from './commands/env';
import { HelpExecutor } from './commands/help';
import { HISTORY_COMMANDS } from './commands/history';
import { CommandExecutor } from './command';
import { SetExecutor } from './commands/set';
import { Environment } from './Environment';
import { CWD_ENV_VAR, PotatoFS, PotatoFSNode, PotatoFSRoot } from './PotatoFS';
import { FS_COMMANDS } from './commands/fsCommands';
import { CLI } from './CLI';
import { BlackjackExecutor } from './commands/blackjack';
import { Formatter } from './Formatter';
import { FILESYSTEM_ROOT } from './generated/filesystem';

export const OSID = '🥔 PotatOS 0.1b';
const commandChunker = new Chunker('', 1);

// lifted from: https://stackoverflow.com/a/30407959
const dataURLtoBlob = (dataurl: string): Blob => {
    var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)![1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
}

const deserializeFS = <T extends PotatoFSNode>(item: T, nodepath: string, env: Environment): T => {
    const node = { 
        // make a copy, don't mutate original
        ...item,
        
        // expand env variables in names
        name: env.interpolate(item.name),
    };
    
    if (PotatoFS.isDir(node)) {
        node.children = Object.keys(node.children).map(name => {
            const child = node.children[name];
            const childPath = PotatoFS.join(nodepath, name);
            return deserializeFS(child, childPath, env);
        }).reduce((map, child) => {
            map[child.name] = child;
            return map;
        }, {} as { [name: string]: PotatoFSNode });

    } else if (PotatoFS.isFile(node)) {
        if (typeof node.blob === 'string') {
            node.blob = dataURLtoBlob(node.blob);
        }

    } else {
        throw new Error('Error initializing file system. Unknown node type: ' + JSON.stringify(node));
    }

    return node;
};

const createDefaultFileSystem = (env: Environment): PotatoFS => {
    const root = deserializeFS(FILESYSTEM_ROOT as PotatoFSRoot, '/', env);
    return new PotatoFS(root, env);
};

export class OSCore {
    readonly environment;
    readonly fs: PotatoFS;
    private readonly commands: Record<string, CommandExecutor>;

    constructor() {
        this.environment = new Environment({
            [CWD_ENV_VAR]: '/',
            USER: 'spud',
            TAB: '  '
        });
        this.fs = createDefaultFileSystem(this.environment);
        this.commands = {
            alias: new AliasExecutor(),
            blackjack: BlackjackExecutor,
            env: new EnvExecutor(),
            help: new HelpExecutor(),
            set: new SetExecutor(),
            about: {
                shortDescription: 'About this project',
                invoke: async context => {
                    const { cli } = context;
                    cli.println(OSID);
                    cli.println(new Array(80).fill('═').join(''));
                    cli.println(Formatter.table([
                        ['Source code', 'https://github.com/dgrundel/PotatOS'],
                        ['Browser support', 'Recent versions of modern browsers.'],
                    ], 4));
                    return 0;
                }
            },
            clear: {
                shortDescription: 'Clear the console',
                invoke: async context => {
                    context.cli.clear();
                    return 0;
                }
            },
            echo: {
                shortDescription: 'Say something',
                invoke: async context => {
                    const { cli, env } = context;
                    const str = env.interpolate(context.args);
                    cli.println(str);
                    return 0;
                }
            },
            html: {
                shortDescription: 'Run an HTML "app"',
                invoke: async context => {
                    const { cli, args } = context;
                    const chunks = new Chunker().append(args.trim()).flush();
                    const htmlPath = chunks.shift()!.content; // remove html file path from chunks
                    const htmlArgs = Chunker.join(chunks);
                    const htmlContext = {
                        ...context,
                        args: htmlArgs
                    };
                    return cli.invokeHtml(htmlPath, htmlContext);
                }
            },
            potato: {
                shortDescription: 'Print a cute, little potato',
                invoke: async context => {
                    context.cli.println('🥔');
                    return 0;
                }
            },
            sleep: {
                shortDescription: 'Wait a while',
                invoke: async context => new Promise(resolve => {
                    const { cli, args } = context;
                    const seconds = +(args.trim());
                    if (seconds > 0) {
                        cli.println(`Sleeping for ${seconds} seconds.`);
                        setTimeout(resolve, seconds * 1000);
                    }
                })
            },
            ...HISTORY_COMMANDS,
            ...FS_COMMANDS,
        };
    }

    getRegisteredCommands(): Record<string, CommandExecutor> {
        return this.commands;
    }

    registerCommand(name: string, command: CommandExecutor): void {
        if (this.commands[name] && this.commands[name].disallowOverride) {
            throw new Error(`${name} cannot be overridden.`);
        }
        
        this.commands[name] = command;
    }

    async invokeCommand(line: string, cli: CLI): Promise<number | Error> {
        const cmd = commandChunker.append(line).flush()[0].content;

        // run command
        if (this.commands.hasOwnProperty(cmd)) {
            const executor = this.commands[cmd];
            const args = line.substring(cmd.length).trim();

            try {
                return executor.invoke({
                    command: cmd,
                    args,
                    cli,
                    env: this.environment,
                    fs: this.fs,
                    core: this
                }).catch(err => {
                    return err as Error;
                });
            } catch (e) {
                return e as Error;
            }
            
        }

        return new Error(`Unknown command "${cmd}"\nType "help" if you need some.`);
    }
}