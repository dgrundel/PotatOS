import { OSID } from './OSCore';
export const PROMPT_ENV_VAR = 'PROMPT';
export const HISTORY_MAX_ENV_VAR = 'HISTORY_MAX';
export class CLI {
    core;
    input;
    output;
    history = [];
    constructor(core, input, output) {
        this.core = core;
        this.input = input;
        this.output = output;
        this.init();
    }
    getHistory() {
        return this.history.slice();
    }
    clear() {
        this.output.innerHTML = '';
    }
    out(s, cls) {
        const e = document.createElement('span');
        e.className = cls;
        e.textContent = s;
        this.output.appendChild(e);
        this.scroll();
        return e;
    }
    stdout(s) {
        return this.out(s, 'stdout');
    }
    stderr(s) {
        return this.out(s, 'stderr');
    }
    println(...args) {
        return this.stdout(args.join(' ') + '\n');
    }
    printerr(...args) {
        return this.stderr(args.join(' '));
    }
    scroll() {
        // scroll frame to input
        const frame = this.output.parentNode;
        frame.scrollTop = frame.scrollHeight;
    }
    async readln(prompt, history = []) {
        const abortController = new AbortController();
        const inputContainer = this.input.parentNode;
        return new Promise(resolve => {
            let historyCursor = 0;
            const keydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    resolve(this.input.textContent || '');
                    historyCursor = 0;
                }
                else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (e.key === 'ArrowDown') { // cursor += 1
                        historyCursor = historyCursor === history.length - 1 ? 0 : (historyCursor + 1);
                    }
                    else { // ArrowUp, cursor -= 1
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
    getPrompt() {
        const str = this.core.environment.getString(PROMPT_ENV_VAR);
        return this.core.environment.interpolate(str);
    }
    async invokeInput(str) {
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
    }
    ;
    init() {
        this.println(OSID + '\n');
        document.title = OSID;
        this.core.environment.put(HISTORY_MAX_ENV_VAR, 100);
        this.core.environment.put(PROMPT_ENV_VAR, '$CWD $');
        document.documentElement.addEventListener('click', e => {
            this.input.focus();
        });
        const awaitInput = () => {
            return this.readln(this.getPrompt(), this.history)
                .then(line => this.invokeInput(line))
                .then(awaitInput);
        };
        awaitInput();
    }
}
