import { CommandContext } from './command';
import { OSID, OSCore } from './OSCore';
import { PotatoFS } from './PotatoFS';

export const PROMPT_ENV_VAR = 'PROMPT';
export const HISTORY_MAX_ENV_VAR = 'HISTORY_MAX';
const HISTORY_STORAGE_KEY = 'POTATOS_CLI_HISTORY';

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

    clearHistory(): void {
        this.history.splice(0);
        this.storeHistory();
    }

    clear(): void {
        this.output.innerHTML = '';
    }

    out(s: string, cls: string) {
        const e = document.createElement('span');
        e.className = cls;
        e.textContent = s;
        
        this.output.appendChild(e);
        this.scroll();

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

    scroll() {
        // scroll frame to input
        const frame = this.output.parentNode as HTMLElement;
        frame.scrollTop = frame.scrollHeight;
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
            this.focusInput();

            this.scroll();

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

    async invokeHtml(path: string, context: CommandContext): Promise<number> {
        const fs = this.core.fs;
        const cli = this;
        const node = fs.get(path);

        if (!PotatoFS.isFile(node)) {
            cli.printerr(`"${node.name}" is not a file.`);
            return 1;
        }

        return PotatoFS.getText(node)
            .then(text => {
                // hide output element
                this.output.style.visibility = 'hidden';
                
                // create iframe and append to body (invisible)
                const iframe = document.createElement('iframe');
                iframe.className = 'app-frame';
                iframe.style.visibility = 'hidden';
                this.output.parentNode!.appendChild(iframe);

                // link base styles
                iframe.addEventListener('load', () => {
                    const link = document.createElement('link');
                    link.setAttribute('type', 'text/css');
                    link.setAttribute('rel', 'stylesheet');
                    link.setAttribute('href', './public/base-style.css');
                    iframe.contentDocument!.head.appendChild(link);

                    // once styles are loaded, show iframe
                    link.onload = () => {
                        iframe.style.visibility = 'visible';
                    };
                });

                // set iframe content, which will trigger load event
                iframe.srcdoc = text;
                return iframe;
            })
            .then(iframe => new Promise<void>(resolve => {
                (iframe.contentWindow as any).PotatOS = {
                    context,
                    exit: () => {
                        iframe.parentNode!.removeChild(iframe);
                        this.output.style.visibility = 'visible';
                        resolve();
                    }
                };
            }))
            .then(() => 0);
    }

    private storeHistory() {
        if (window.localStorage) {
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(this.history));
        }
    }

    private focusInput(): void {
        this.input.focus();
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
            this.storeHistory();
        }
    };

    private init() {
        this.println(OSID + '\n');
        document.title = OSID;

        this.core.environment.put(HISTORY_MAX_ENV_VAR, 100);
        this.core.environment.put(PROMPT_ENV_VAR, '$CWD $');

        // load history from LocalStorage
        if (window.localStorage) {
            const historyJson = localStorage.getItem(HISTORY_STORAGE_KEY);
            if (historyJson) {
                try {
                    const history = JSON.parse(historyJson);
                    if (Array.isArray(history)) {
                        this.history.push.apply(this.history, history);
                    } else {
                        throw new Error(`"${historyJson}" is not a JSON array.`);
                    }
                } catch (e: any) {
                    this.printerr(`Error loading history from LocalStorage: ${e.message}`);
                }
            }
        }
    
        document.body.addEventListener('click', e => {
            const selection = document.getSelection();
            if (!selection || selection.isCollapsed) {
                this.focusInput();
            }
        });

        const awaitInput = (): Promise<void> => {
            return this.readln(this.getPrompt(), this.history)
            .then(line => this.invokeInput(line))
            .then(awaitInput);
        };

        awaitInput();
    }

}