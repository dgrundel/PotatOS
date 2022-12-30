import { OSID, OSCore } from './OSCore';

export const PROMPT_ENV_VAR = 'PROMPT';
export const HISTORY_MAX_ENV_VAR = 'HISTORY_MAX';

export class CLI {
    private readonly core: OSCore;
    private readonly input: HTMLInputElement;
    private readonly output: HTMLElement;
    private history: string[] = [];

    constructor(core: OSCore, input: HTMLInputElement, output: HTMLElement) {
        this.core = core;
        this.input = input;
        this.output = output;
        
        this.init();
    }

    getHistory(): string[] {
        return this.history.slice();
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

    private getPrompt(): string {
        const str = this.core.environment.getString(PROMPT_ENV_VAR);
        return this.core.environment.interpolate(str);
    }

    private tick() {
        (this.input.parentNode as HTMLElement).dataset.prompt = this.getPrompt();
        
        const frame = (this.output.parentNode as HTMLElement);
        frame.scrollTop = frame.scrollHeight;

        this.input.focus();
    };

    private async invokeInput() {
        const line = (this.input.textContent || '').trim();
        this.input.textContent = '';
    
        // print entered line to output
        const el = this.println(line);
        el.dataset.prompt = this.getPrompt();
    
        // if there's something to do, do it
        if (line) {
            const result = await this.core.invokeCommand(line, this);

            if (result instanceof Error) {
                this.printerr(result.message);
            }

            // add history entry
            this.history.push(line);
            const historyMax = this.core.environment.getNumber(HISTORY_MAX_ENV_VAR);
            if (historyMax >= 0 && this.history.length > historyMax) {
                this.history = this.history.slice(this.history.length - historyMax);
            }
        }
    };

    private init() {
        let historyCursor = 0;

        this.println(OSID + '\n\n');
        document.title = OSID;

        this.core.environment.put(HISTORY_MAX_ENV_VAR, 100);
        this.core.environment.put(PROMPT_ENV_VAR, '$CWD $');
    
        this.input.addEventListener('keydown', (e: KeyboardEvent) => {
            
            new Promise<void>(resolve => {
                if (e.key === 'Enter') {
                    e.preventDefault();
        
                    // TODO await this
                    const inputContainer = this.input.parentNode as HTMLElement;
                    inputContainer.style.visibility = 'hidden';
                    this.invokeInput().then(() => {
                        inputContainer.style.visibility = 'visible';
                        resolve();
                    });
                    historyCursor = 0;
        
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
        
                    historyCursor = (historyCursor === 0 ? this.history.length : historyCursor) - 1;
                    this.input.textContent = this.history[historyCursor];
                    resolve();
                    
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    
                    historyCursor = historyCursor === this.history.length - 1 ? 0 : (historyCursor + 1);
                    this.input.textContent = this.history[historyCursor];
                    resolve();
                }
            }).then(() => {
                this.tick();
            });
        });
    
        document.documentElement.addEventListener('click', e => {
            this.input.focus();
        });
    
        this.tick();
    }
}