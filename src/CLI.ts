import {Chunker} from './Chunker';
import { AliasExecutor } from './commands/alias';
import { EnvExecutor } from './commands/env';
import { HelpExecutor } from './commands/help';
import { HistoryExecutor } from './commands/history';
import { CommandExecutor } from './commands/interface';
import { PotatoExecutor } from './commands/potato';
import { SetExecutor } from './commands/set';

const osid = '🥔 PotatOS 0.1b';
const commandChunker = new Chunker('', 1);

const TAB = '  ';
const ENV_REPLACE_PATTERN = /\$([a-zA-Z0-9_-]+)/g;
const ENV_KEY_TEST_PATTERN = /^[A-Za-z0-9_-]+$/;

const ENV: Record<string, string> = {
    PROMPT: '>',
    HISTORY_MAX: '100',
    USER: 'p0tat0luv3r'
};


const toArray = (o: any) => {
    if (typeof o.length === 'number') {
        return Array.prototype.slice.call(o);
    } else if (typeof o === 'boolean') {
        return [o];
    } else {
        return [].concat(o || []);
    }
};

const replaceEnvVars = (s: string) => {
    return s.replace(ENV_REPLACE_PATTERN, (raw: string, key: string) => {
        return (ENV.hasOwnProperty(key) ? ENV[key as keyof typeof ENV] : raw) as string;
    });
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
            shortDescription: 'Clear the console',
            invoke: () => {
                // this is a hack. should be achieveable without direct access to DOM.
                this.output.innerHTML = '';
                return 0;
            }
        },
        echo: {
            shortDescription: 'Say something.',
            invoke: context => context.cli.println(context.args) && 0
        },
        potato: {
            shortDescription: 'Print a cute, little potato.',
            invoke: context => context.cli.println('🥔') && 0
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
        this.commands[name] = command;
    }

    getEnvironmentKeys() {
        return Object.keys(ENV);
    }

    getEnvironmentValue(key: string): string {
        return ENV[key as keyof typeof ENV] as string || '';
    }

    setEnvironmentValue(key: string, value: string) {
        ENV[key as keyof typeof ENV] = value;
    }

    println(...args: any[]) {
        const el = document.createElement('div');
        el.textContent = args.map(a => a.toString ? a.toString() : a).join(' ');
        this.output.appendChild(el);
        return el;
    }

    printerr(...args: any[]) {
        const el = this.println.apply(this, args);
        el.classList.add('stderr');
    }

    // private parseInput(line) {
    //     // parse user input
    //     let args = chunker.append(line).flush();
    //     let cmd: string = args.shift()?.content!;
    
    //     // check for alias
    //     if (ALIAS.hasOwnProperty(cmd)) {
    //         let alias = ALIAS[cmd];
    //         let aliasArgs = chunker.append(alias).flush();
            
    //         // the cmd is now whatever was at the front of the alias
    //         cmd = aliasArgs.shift()?.content!;
    //         // the full args list is args from alias + args from input
    //         args = aliasArgs.concat(args);
    //     }
    
    //     return { 
    //         cmd, 
    //         args: args.map(a => replaceEnvVars(a)),
    //     };
    // }

    private tick() {
        (this.input.parentNode as HTMLElement).dataset.prompt = ENV.PROMPT;
        
        const frame = (this.output.parentNode as HTMLElement);
        frame.scrollTop = frame.scrollHeight;
    };
    
    private execute() {
        const line = (this.input.textContent || '').trim();
        this.input.textContent = '';
    
        // print entered line to output
        const el = this.println(line);
        el.dataset.prompt = ENV.PROMPT;
    
        // if there's something to do, do it
        if (line) {
            const cmd = commandChunker.append(line).flush()[0].content;
            const args = line.substring(cmd.length).trim();
    
            // run command
            if (this.commands.hasOwnProperty(cmd)) {
                const executor = this.commands[cmd];
                executor.invoke({
                    cli: this,
                    command: cmd,
                    args
                });
            } else {
                this.printerr(`Unknown command "${cmd}"`);
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
    
                this.execute();
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