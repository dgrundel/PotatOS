const out = document.getElementById('out');
const stdin = document.getElementById('stdin');
const input = document.getElementById('input');

const TAB = '  ';
const ENV_REPLACE_PATTERN = /\$([a-zA-Z0-9_-]+)/g;
const ENV_KEY_TEST_PATTERN = /^[A-Za-z0-9_-]+$/g;

const ENV = {
    PROMPT: '>',
    HISTORY_MAX: 100
};
const ALIAS = {
    printenv: 'env'
};
let HISTORY = [];

const COMMANDS = {
    alias: {
        description: 'List and create aliases for commands.',
        fn: () => {
            Object.keys(ALIAS).sort().forEach(key => {
                println(key + '=' + ALIAS[key]);
            });
        }
    },
    echo: {
        description: 'Say something.',
        fn: (...args) => {
            println.apply(undefined, args);
        }
    },
    env: {
        description: 'Display environment values.',
        fn: () => {
            Object.keys(ENV).sort().forEach(key => {
                println(key + '=' + ENV[key]);
            });
        }
    },
    help: {
        description: 'Prints this message.',
        fn: () => {
            println('Available commands:');
            Object.keys(COMMANDS).sort().forEach(cmd => {
                println(TAB + cmd + ' - ' + COMMANDS[cmd].description);
            });
        }
    },
    history: {
        description: 'List previous commands.',
        fn: () => {
            HISTORY.forEach((line, i) => {
                println(i, line);
            });
        }
    },
    potato: {
        description: 'Print a cute, little potato.',
        fn: () => {
            println('🥔');
        }
    },
    set: {
        description: 'Set an environment value.',
        fn: (...args) => {
            for (let i = 0; i < args.length; i += 3) {
                const key = args[i];
                const eq = args[i+1];
                const value = args[i+2];

                if (!key || (eq !== '=')) {
                    printerr('Syntax error: Set variables using "key=value" syntax. Got ', key, eq, value);
                    return;
                }

                if (!ENV_KEY_TEST_PATTERN.test(key)) {
                    printerr(`Error: Variable "${key}" must match pattern ${ENV_KEY_TEST_PATTERN.toString()}.`);
                    return;
                }

                ENV[key] = value;
            }
        }
    }
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

const println = (...args) => {
    const el = document.createElement('div');
    el.textContent = args.map(a => a.toString ? a.toString() : a).join(' ');
    out.appendChild(el);
    return el;
}

const printerr = (...args) => {
    const el = println.apply(undefined, args);
    el.classList.add('stderr');
}

const replaceEnvVars = s => {
    return s.replace(ENV_REPLACE_PATTERN, (raw, key) => ENV.hasOwnProperty(key) ? ENV[key] : raw);
};

const chunkInput = s => {
    const len = s.length;
    const chunks = [];
    let buf = '';
    let inQ = false;
    let inEsc = false;
    var i, ch;
    const chunkChars = {
        '=': true
    };

    for(i = 0; i < len; i++) {
        ch = s.charAt(i);

        if (ch === '\\' && inEsc === false) {
            inEsc = true;
            continue;
        }
        
        if (inEsc === true) {
            buf += ch;
            inEsc = false;
            continue;
        }
        
        if (ch === '"') {
            if (inQ === true) {
                chunks.push(buf);
                buf = '';
            }
            if (inQ === false && buf) {
                chunks.push(buf);
                buf = '';
            }
            inQ = !inQ;
            continue;
        }
        
        if (inQ === false && /\s/.test(ch)) {
            if (buf) {
                chunks.push(buf);
                buf = '';
            }
            continue;
        }
        
        if (chunkChars[ch] === true) {
            if (buf) {
                chunks.push(buf);
                buf = '';
            }
            chunks.push(ch);
            continue;
        }
        
        buf += ch;
    }

    if (buf) {
        chunks.push(buf);
    }
    
    return chunks;
}

const tick = () => {
    stdin.dataset.prompt = ENV.PROMPT;
};

const execute = () => {
    const line = input.textContent;
    input.textContent = '';

    // print entered line to output
    const el = println(line);
    el.dataset.prompt = ENV.PROMPT;

    // if there's something to do, do it
    if (line) {
        
        // parse
        const replaced = replaceEnvVars(line);
        const args = chunkInput(replaced);
        const cmd = args.shift();
        const context = {
            cmd: cmd,
            args: args,
            raw: line,
            replaced: replaced
        };
    
        // run command
        if (COMMANDS.hasOwnProperty(cmd)) {
            const info = COMMANDS[cmd];
            info.fn.apply(context, args);
        } else {
            println(`Unknown command "${cmd}"`);
            println('Type "help" if you need some.');
        }
    }

    // add history entry
    HISTORY.push(line);
    if (ENV.HISTORY_MAX >= 0 && HISTORY.length > ENV.HISTORY_MAX) {
        HISTORY = HISTORY.slice(HISTORY.length - ENV.HISTORY_MAX);
    }
};

const init = () => {
    let historyCursor = 0;

    const osid = '🥔 PotatOS 0.1b';
    println(osid + '\n\n');
    document.title = osid;

    /*
        TODO:
            alias
            tab completion?
            ctrl+c to abort
     */

    input.addEventListener('keydown', e => {

        if (e.key === 'Enter') {
            e.preventDefault();

            execute();
            historyCursor = 0;

        } else if (e.key === 'ArrowUp') {
            e.preventDefault();

            historyCursor = (historyCursor === 0 ? HISTORY.length : historyCursor) - 1;
            input.textContent = HISTORY[historyCursor];
            input.focus();
            
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            
            historyCursor = historyCursor === HISTORY.length - 1 ? 0 : (historyCursor + 1);
            input.textContent = HISTORY[historyCursor];
            input.focus();
        }

        tick();
    });

    document.documentElement.addEventListener('click', e => {
        input.focus();
    });

    input.focus();
    tick();
};

init();