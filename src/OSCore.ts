import { Chunker } from './Chunker';
import { AliasExecutor } from './commands/alias';
import { EnvExecutor } from './commands/env';
import { HelpExecutor } from './commands/help';
import { HistoryExecutor } from './commands/history';
import { CommandExecutor } from './command';
import { SetExecutor } from './commands/set';
import { Environment } from './Environment';
import { CWD_ENV_VAR, PotatoFS } from './PotatoFS';
import { FS_COMMANDS } from './commands/fsCommands';
import { CLI } from './CLI';

export const OSID = '🥔 PotatOS 0.1b';
const commandChunker = new Chunker('', 1);

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
        this.fs = new PotatoFS({ name: '', children: [] }, this.environment);
        this.commands = {
            alias: new AliasExecutor(),
            env: new EnvExecutor(),
            help: new HelpExecutor(),
            history: new HistoryExecutor(),
            set: new SetExecutor(),
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
                    const cli = context.cli;
                    const env = context.env;
                    const str = env.interpolate(context.args);
                    cli.println(str);
                    return 0;
                }
            },
            potato: {
                shortDescription: 'Print a cute, little potato',
                invoke: async context => {
                    context.cli.println('🥔');
                    return 0;
                }
            },
            ...FS_COMMANDS
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