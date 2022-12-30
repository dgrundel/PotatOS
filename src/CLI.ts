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

    out(s: string, cls: string) {
        const e = document.createElement('span');
        e.className = cls;
        e.textContent = s;
        this.output.appendChild(e);
        return e;
    }

    stdout(s: string): HTMLElement {
        return this.out(s, 'stdout');
    }

    stderr(s: string): HTMLElement {
        return this.out(s, 'stderr');
    }

    println(...args: any[]): HTMLElement {
        return this.stdout(args.join(' ') + '\n');
    }

    printerr(...args: any[]): HTMLElement {
        return this.stderr(args.join(' '));
    }

    async readln(prompt: string, history: string[] = []): Promise<string> {
        const abortController = new AbortController();
        const inputContainer = this.input.parentNode as HTMLElement;

        return new Promise<string>(resolve => {
            let historyCursor = 0;

            const keydown = (e: KeyboardEvent) => {
        
                if (e.key === 'Enter') {
                    e.preventDefault();
        
                    resolve(this.input.textContent || '');
                    historyCursor = 0;
        
                } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();

                    if (e.key === 'ArrowDown') { // cursor += 1
                        historyCursor = historyCursor === history.length - 1 ? 0 : (historyCursor + 1);
                    } else { // ArrowUp, cursor -= 1
                        historyCursor = (historyCursor === 0 ? history.length : historyCursor) - 1;
                    }
                    this.input.textContent = history[historyCursor];
                }
            };
    
            // attach listener
            this.input.addEventListener('keydown', keydown, {
                signal: abortController.signal
            });

            /*
             * Prepare input
             */
            
            // show requested prompt
            inputContainer.dataset.prompt = prompt;
        
            inputContainer.style.visibility = 'visible';
            this.input.focus();

            // scroll frame to input
            const frame = this.output.parentNode as HTMLElement;
            frame.scrollTop = frame.scrollHeight;

        }).then(value => {
            /*
             * Reset input
             */
            inputContainer.style.visibility = 'hidden';
            this.input.textContent = '';
            inputContainer.dataset.prompt = this.getPrompt();

            // remove listener
            abortController.abort();

            return value;
        });
    }

    private getPrompt(): string {
        const str = this.core.environment.getString(PROMPT_ENV_VAR);
        return this.core.environment.interpolate(str);
    }

    private async invokeInput(str: string) {
        const line = (str || '').trim();
    
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
        this.println(OSID + '\n\n');
        document.title = OSID;

        this.core.environment.put(HISTORY_MAX_ENV_VAR, 100);
        this.core.environment.put(PROMPT_ENV_VAR, '$CWD $');
    
        document.documentElement.addEventListener('click', e => {
            this.input.focus();
        });

        const awaitInput = (): Promise<void> => {
            return this.readln(this.getPrompt(), this.history)
            .then(line => this.invokeInput(line))
            .then(awaitInput);
        };

        awaitInput();
    }

}