import { Chunker } from './Chunker';
import { AliasExecutor } from './commands/alias';
import { EnvExecutor } from './commands/env';
import { HelpExecutor } from './commands/help';
import { HistoryExecutor } from './commands/history';
import { SetExecutor } from './commands/set';
import { Environment } from './Environment';
import { CWD_ENV_VAR, PotatoFS } from './PotatoFS';
import { FS_COMMANDS } from './commands/fsCommands';
export const OSID = '🥔 PotatOS 0.1b';
const commandChunker = new Chunker('', 1);
const createDefaultFileSystem = (env) => {
    const fs = new PotatoFS({ name: '', children: [] }, env);
    const homedir = env.interpolate('/home/$USER');
    fs.mkdirp(homedir);
    fs.mkdirp('/tmp');
    fs.cd(homedir);
    return fs;
};
export class OSCore {
    environment;
    fs;
    commands;
    constructor() {
        this.environment = new Environment({
            [CWD_ENV_VAR]: '/',
            USER: 'spud',
            TAB: '  '
        });
        this.fs = createDefaultFileSystem(this.environment);
        this.commands = {
            alias: new AliasExecutor(),
            env: new EnvExecutor(),
            help: new HelpExecutor(),
            history: new HistoryExecutor(),
            set: new SetExecutor(),
            clear: {
                shortDescription: 'Clear the console',
                invoke: async (context) => {
                    context.cli.clear();
                    return 0;
                }
            },
            echo: {
                shortDescription: 'Say something',
                invoke: async (context) => {
                    const cli = context.cli;
                    const env = context.env;
                    const str = env.interpolate(context.args);
                    cli.println(str);
                    return 0;
                }
            },
            potato: {
                shortDescription: 'Print a cute, little potato',
                invoke: async (context) => {
                    context.cli.println('🥔');
                    return 0;
                }
            },
            sleep: {
                shortDescription: 'Wait a while',
                invoke: async (context) => new Promise(resolve => {
                    const { cli, args } = context;
                    const seconds = +(args.trim());
                    if (seconds > 0) {
                        cli.println(`Sleeping for ${seconds} seconds.`);
                        setTimeout(resolve, seconds * 1000);
                    }
                })
            },
            ...FS_COMMANDS
        };
    }
    getRegisteredCommands() {
        return this.commands;
    }
    registerCommand(name, command) {
        if (this.commands[name] && this.commands[name].disallowOverride) {
            throw new Error(`${name} cannot be overridden.`);
        }
        this.commands[name] = command;
    }
    async invokeCommand(line, cli) {
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
                    return err;
                });
            }
            catch (e) {
                return e;
            }
        }
        return new Error(`Unknown command "${cmd}"\nType "help" if you need some.`);
    }
}
