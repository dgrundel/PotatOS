import {Chunker} from './Chunker';
import { AliasExecutor } from './commands/alias';
import { EnvExecutor } from './commands/env';
import { HelpExecutor } from './commands/help';
import { HistoryExecutor } from './commands/history';
import { CommandExecutor } from './commands/interface';
import { SetExecutor } from './commands/set';

const osid = '🥔 PotatOS 0.1b';
const commandChunker = new Chunker('', 1);

const ENV_REPLACE_PATTERN = /\$([a-zA-Z0-9_-]+)/g;

const ENV: Record<string, string> = {
    PROMPT: '>',
    HISTORY_MAX: '100',
    USER: 'spud',
    TAB: '  '
};

export class CLI {
    private readonly input: HTMLInputElement;
    private readonly output: HTMLElement;
    private history: string[] = [];
    private readonly commands: Record<string, CommandExecutor> = {
        alias: new AliasExecutor(),
        env: new EnvExecutor(),
        help: new HelpExecutor(),
        history: new HistoryExecutor(),
        set: new SetExecutor(),
        clear: {
            shortDescription: 'Clear the console.',
            invoke: cli => {
                cli.clear();
                return 0;
            }
        },
        echo: {
            shortDescription: 'Say something.',
            invoke: (cli, context) => {
                const str = cli.replaceEnvironmentValues(context.args);
                cli.println(str);
                return 0;
            }
        },
        potato: {
            shortDescription: 'Print a cute, little potato.',
            invoke: cli => {
                cli.println('🥔');
                return 0;
            }
        }
    };

    constructor(input: HTMLInputElement, output: HTMLElement) {
        this.input = input;
        this.output = output;

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

    getEnvironmentKeys(): string[] {
        return Object.keys(ENV);
    }

    getEnvironmentValue(key: string): string {
        return ENV[key as keyof typeof ENV] as string || '';
    }

    setEnvironmentValue(key: string, value: string): void {
        ENV[key as keyof typeof ENV] = value;
    }

    replaceEnvironmentValues(s: string): string {
        return s.replace(ENV_REPLACE_PATTERN, (raw: string, key: string) => {
            return (ENV.hasOwnProperty(key) ? ENV[key as keyof typeof ENV] : raw) as string;
        });
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

            return executor.invoke(this, {
                command: cmd,
                args
            });
        }

        return new Error(`Unknown command "${cmd}"`);
    }

    private tick() {
        (this.input.parentNode as HTMLElement).dataset.prompt = ENV.PROMPT;
        
        const frame = (this.output.parentNode as HTMLElement);
        frame.scrollTop = frame.scrollHeight;
    };

    private invokeInput() {
        const line = (this.input.textContent || '').trim();
        this.input.textContent = '';
    
        // print entered line to output
        const el = this.println(line);
        el.dataset.prompt = ENV.PROMPT;
    
        // if there's something to do, do it
        if (line) {
            const result = this.invokeCommand(line);

            if (result instanceof Error) {
                this.printerr(result.message);
                this.printerr('Type "help" if you need some.');
            }

            // add history entry
            this.history.push(line);
            const historyMax = parseInt(ENV.HISTORY_MAX);
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