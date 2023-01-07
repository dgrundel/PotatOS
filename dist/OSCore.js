import { Chunker } from './Chunker';
import { ALIAS_EXECUTOR } from './commands/alias';
import { ENV_COMMANDS } from './commands/envCommands';
import { HELP_EXECUTOR } from './commands/help';
import { CLI_COMMANDS } from './commands/cliCommands';
import { Environment } from './Environment';
import { CWD_ENV_VAR, deserializeFS, PotatoFS } from './PotatoFS';
import { FS_COMMANDS } from './commands/fsCommands';
import { BLACKJACK_EXECUTOR } from './commands/blackjack';
import { Formatter } from './Formatter';
import { FILESYSTEM_ROOT } from './generated/filesystem';
export const OSID = '🥔 PotatOS 0.1b';
const commandChunker = new Chunker('', 1);
const createDefaultFileSystem = (env) => {
    const root = deserializeFS(FILESYSTEM_ROOT, '/', undefined, env);
    return new PotatoFS(root, env);
};
export class OSCore {
    environment;
    fs;
    commands;
    executableExtensions;
    constructor() {
        this.environment = new Environment({
            [CWD_ENV_VAR]: '/',
            USER: 'spud',
            TAB: '  '
        });
        this.fs = createDefaultFileSystem(this.environment);
        this.commands = {
            alias: ALIAS_EXECUTOR,
            blackjack: BLACKJACK_EXECUTOR,
            help: HELP_EXECUTOR,
            about: {
                shortDescription: 'About this project',
                invoke: async (context) => {
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
            html: {
                shortDescription: 'Run an HTML "app"',
                invoke: async (context) => {
                    const { cli, args } = context;
                    const chunks = new Chunker().append(args.trim()).flush();
                    const htmlPath = chunks.shift().content; // remove html file path from chunks
                    const htmlArgs = Chunker.join(chunks);
                    const htmlContext = {
                        ...context,
                        args: htmlArgs
                    };
                    return cli.invokeHtml(htmlPath, htmlContext);
                }
            },
            ...CLI_COMMANDS,
            ...ENV_COMMANDS,
            ...FS_COMMANDS,
        };
        this.executableExtensions = {
            '.html': 'html'
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
        const trimmed = line.trim();
        let cmd = commandChunker.append(trimmed).flush()[0].content;
        let args = trimmed.substring(cmd.length).trim();
        const ext = PotatoFS.extname(cmd);
        if (ext && this.executableExtensions[ext]) {
            try {
                const node = this.fs.get(cmd);
                if (PotatoFS.isFile(node)) {
                    args = `${cmd} ${args}`;
                    cmd = this.executableExtensions[ext];
                }
            }
            catch (e) {
                // do nothing
            }
        }
        // run command
        if (this.commands.hasOwnProperty(cmd)) {
            const executor = this.commands[cmd];
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
