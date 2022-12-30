import { Chunker } from './Chunker';
import { AliasExecutor } from './commands/alias';
import { EnvExecutor } from './commands/env';
import { HelpExecutor } from './commands/help';
import { HistoryExecutor } from './commands/history';
import { SetExecutor } from './commands/set';
import { Environment } from './Environment';
import { CWD_ENV_VAR, PotatoFS } from './PotatoFS';
import { FS_COMMANDS } from './commands/fsCommands';
const osid = '🥔 PotatOS 0.1b';
const commandChunker = new Chunker('', 1);
export const PROMPT_ENV_VAR = 'PROMPT';
export class CLI {
    input;
    output;
    environment;
    commands;
    fs;
    history = [];
    constructor(input, output) {
        this.input = input;
        this.output = output;
        this.environment = new Environment({
            [PROMPT_ENV_VAR]: '$',
            [CWD_ENV_VAR]: '/',
            HISTORY_MAX: '100',
            USER: 'spud',
            TAB: '  '
        });
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
            ...FS_COMMANDS
        };
        this.fs = new PotatoFS({ name: '', children: [] }, this.environment);
        this.init();
    }
    getHistory() {
        return this.history.slice();
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
    clear() {
        this.output.innerHTML = '';
    }
    println(...args) {
        const el = document.createElement('div');
        el.textContent = args.map(a => a.toString ? a.toString() : a).join(' ');
        this.output.appendChild(el);
        // this is a hack. There should be a better way to handle this.
        return el;
    }
    printerr(...args) {
        const el = this.println.apply(this, args);
        el.classList.add('stderr');
    }
    async invokeCommand(line) {
        const cmd = commandChunker.append(line).flush()[0].content;
        // run command
        if (this.commands.hasOwnProperty(cmd)) {
            const executor = this.commands[cmd];
            const args = line.substring(cmd.length).trim();
            try {
                return executor.invoke({
                    command: cmd,
                    args,
                    cli: this,
                    env: this.environment,
                    fs: this.fs
                });
            }
            catch (e) {
                return e;
            }
        }
        return new Error(`Unknown command "${cmd}"\nType "help" if you need some.`);
    }
    tick() {
        this.input.parentNode.dataset.prompt = this.environment.getString(PROMPT_ENV_VAR);
        const frame = this.output.parentNode;
        frame.scrollTop = frame.scrollHeight;
    }
    ;
    async invokeInput() {
        const line = (this.input.textContent || '').trim();
        this.input.textContent = '';
        // print entered line to output
        const el = this.println(line);
        el.dataset.prompt = this.environment.getString(PROMPT_ENV_VAR);
        // if there's something to do, do it
        if (line) {
            const result = await this.invokeCommand(line);
            if (result instanceof Error) {
                this.printerr(result.message);
            }
            // add history entry
            this.history.push(line);
            const historyMax = this.environment.getNumber('HISTORY_MAX');
            if (historyMax >= 0 && this.history.length > historyMax) {
                this.history = this.history.slice(this.history.length - historyMax);
            }
        }
    }
    ;
    init() {
        let historyCursor = 0;
        this.println(osid + '\n\n');
        document.title = osid;
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                // TODO await this
                this.invokeInput();
                historyCursor = 0;
            }
            else if (e.key === 'ArrowUp') {
                e.preventDefault();
                historyCursor = (historyCursor === 0 ? this.history.length : historyCursor) - 1;
                this.input.textContent = this.history[historyCursor];
                this.input.focus();
            }
            else if (e.key === 'ArrowDown') {
                e.preventDefault();
                historyCursor = historyCursor === this.history.length - 1 ? 0 : (historyCursor + 1);
                this.input.textContent = this.history[historyCursor];
                this.input.focus();
            }
            this.tick();
        });
        document.documentElement.addEventListener('click', e => {
            this.input.focus();
        });
        this.input.focus();
        this.tick();
    }
}
