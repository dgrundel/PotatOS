import { Chunker } from './Chunker';
import { AliasExecutor } from './commands/alias';
import { EnvExecutor } from './commands/env';
import { HelpExecutor } from './commands/help';
import { HistoryExecutor } from './commands/history';
import { CommandExecutor } from './command';
import { SetExecutor } from './commands/set';
import { Environment } from './Environment';
import { CWD_ENV_VAR } from './FileSystem';

const osid = '🥔 PotatOS 0.1b';
const commandChunker = new Chunker('', 1);
export const PROMPT_ENV_VAR = 'PROMPT';

export class CLI {
    private readonly input: HTMLInputElement;
    private readonly output: HTMLElement;
    private readonly environment;    
    private readonly commands: Record<string, CommandExecutor>;
    private history: string[] = [];

    constructor(input: HTMLInputElement, output: HTMLElement) {
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
                shortDescription: 'Clear the console.',
                invoke: context => {
                    context.cli.clear();
                    return 0;
                }
            },
            echo: {
                shortDescription: 'Say something.',
                invoke: (context) => {
                    const cli = context.cli;
                    const env = context.env;
                    const str = env.interpolate(context.args);
                    cli.println(str);
                    return 0;
                }
            },
            potato: {
                shortDescription: 'Print a cute, little potato.',
                invoke: context => {
                    context.cli.println('🥔');
                    return 0;
                }
            }
        };

        this.init();
    }

    getHistory(): string[] {
        return this.history.slice();
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

    clear(): void {
        this.output.innerHTML = '';
    }

    println(...args: any[]): HTMLElement {
        const el = document.createElement('div');
        el.textContent = args.map(a => a.toString ? a.toString() : a).join(' ');
        this.output.appendChild(el);
        
        // this is a hack. There should be a better way to handle this.
        return el;
    }

    printerr(...args: any[]) {
        const el = this.println.apply(this, args);
        el.classList.add('stderr');
    }

    invokeCommand(line: string): number | Error {
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
                    env: this.environment
                });
            } catch (e) {
                return e as Error;
            }
            
        }

        return new Error(`Unknown command "${cmd}"\nType "help" if you need some.`);
    }

    private tick() {
        (this.input.parentNode as HTMLElement).dataset.prompt = this.environment.getString(PROMPT_ENV_VAR);
        
        const frame = (this.output.parentNode as HTMLElement);
        frame.scrollTop = frame.scrollHeight;
    };

    private invokeInput() {
        const line = (this.input.textContent || '').trim();
        this.input.textContent = '';
    
        // print entered line to output
        const el = this.println(line);
        el.dataset.prompt = this.environment.getString(PROMPT_ENV_VAR);
    
        // if there's something to do, do it
        if (line) {
            const result = this.invokeCommand(line);

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
    };

    private init() {
        let historyCursor = 0;

        this.println(osid + '\n\n');
        document.title = osid;
    
        this.input.addEventListener('keydown', (e: KeyboardEvent) => {
    
            if (e.key === 'Enter') {
                e.preventDefault();
    
                this.invokeInput();
                historyCursor = 0;
    
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
    
                historyCursor = (historyCursor === 0 ? this.history.length : historyCursor) - 1;
                this.input.textContent = this.history[historyCursor];
                this.input.focus();
                
            } else if (e.key === 'ArrowDown') {
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