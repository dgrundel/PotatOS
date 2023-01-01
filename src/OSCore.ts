import { Chunker } from './Chunker';
import { AliasExecutor } from './commands/alias';
import { EnvExecutor } from './commands/env';
import { HelpExecutor } from './commands/help';
import { HISTORY_COMMANDS } from './commands/history';
import { CommandExecutor } from './command';
import { SetExecutor } from './commands/set';
import { Environment } from './Environment';
import { CWD_ENV_VAR, PotatoFS } from './PotatoFS';
import { FS_COMMANDS } from './commands/fsCommands';
import { CLI } from './CLI';
import { BlackjackExecutor } from './commands/blackjack';
import { Formatter } from './Formatter';

export const OSID = '🥔 PotatOS 0.1b';
const commandChunker = new Chunker('', 1);

const createDefaultFileSystem = (env: Environment): PotatoFS => {
    const fs = new PotatoFS({ name: '', children: [] }, env);
    const homedir = env.interpolate('/home/$USER');
    fs.mkdirp(homedir);
    fs.mkdirp('/tmp');
    fs.cd(homedir);
    return fs;
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
                    return cli.invokeHtml(args.trim(), context);
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