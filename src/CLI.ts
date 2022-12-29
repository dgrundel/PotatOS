import {Chunker} from './Chunker';
import { AliasExecutor } from './commands/alias';
import { EchoExecutor } from './commands/echo';
import { EnvExecutor } from './commands/env';
import { HelpExecutor } from './commands/help';
import { HistoryExecutor } from './commands/history';
import { CommandExecutor } from './commands/interface';
import { PotatoExecutor } from './commands/potato';
import { SetExecutor } from './commands/set';

const osid = '🥔 PotatOS 0.1b';
const chunker = new Chunker();

const TAB = '  ';
const ENV_REPLACE_PATTERN = /\$([a-zA-Z0-9_-]+)/g;
const ENV_KEY_TEST_PATTERN = /^[A-Za-z0-9_-]+$/;

const ENV = {
    PROMPT: '>',
    HISTORY_MAX: 100,
    USER: 'p0tat0luv3r'
};
const ALIAS = {
    printenv: 'env'
};

const COMMANDS: Record<string, CommandExecutor> = {
    alias: new AliasExecutor(),
    echo: new EchoExecutor(),
    env: new EnvExecutor(),
    help: new HelpExecutor(),
    history: new HistoryExecutor(),
    potato: new PotatoExecutor(),
    set: new SetExecutor()
};

const toArray = o => {
    if (typeof o.length === 'number') {
        return Array.prototype.slice.call(o);
    } else if (typeof o === 'boolean') {
        return [o];
    } else {
        return [].concat(o || []);
    }
};

const replaceEnvVars = s => {
    return s.replace(ENV_REPLACE_PATTERN, (raw, key) => ENV.hasOwnProperty(key) ? ENV[key] : raw);
};

export class CLI {
    readonly input: HTMLInputElement;
    readonly output: HTMLElement;
    private history: string[] = [];

    constructor(input: HTMLInputElement, output: HTMLElement) {
        this.input = input;
        this.output = output;

        this.init();
    }

    getHistory(): string[] {
        return this.history.slice();
    }

    getRegisteredCommands(): Record<string, CommandExecutor> {
        return COMMANDS;
    }

    registerCommand(name: string, command: CommandExecutor): void {
        COMMANDS[name] = command;
    }

    getEnvironmentKeys() {
        return Object.keys(ENV);
    }

    getEnvironmentValue(key: string): string {
        return ENV[key] || '';
    }

    setEnvironmentValue(key: string, value: string) {
        ENV[key] = value;
    }

    println(...args) {
        const el = document.createElement('div');
        el.textContent = args.map(a => a.toString ? a.toString() : a).join(' ');
        this.output.appendChild(el);
        return el;
    }

    printerr(...args) {
        const el = this.println.apply(undefined, args);
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
    };
    
    private execute() {
        const line = this.input.textContent || '';
        this.input.textContent = '';
    
        // print entered line to output
        const el = this.println(line);
        el.dataset.prompt = ENV.PROMPT;
    
        // if there's something to do, do it
        if (line) {
            // const context = this.parseInput(line);
            // const { cmd, args } = context;
            const cmd = '';
            const args = '';
    
            // run command
            if (COMMANDS.hasOwnProperty(cmd)) {
                const executor = COMMANDS[cmd];
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
            if (ENV.HISTORY_MAX >= 0 && this.history.length > ENV.HISTORY_MAX) {
                this.history = this.history.slice(this.history.length - ENV.HISTORY_MAX);
            }
        }
    };

    private init() {
        let historyCursor = 0;

        this.println(osid + '\n\n');
        document.title = osid;
    
        /*
            TODO:
    
         */
    
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