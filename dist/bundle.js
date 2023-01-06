(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.PotatOS = {}));
})(this, (function (exports) { 'use strict';

    var ChunkType;
    (function (ChunkType) {
        ChunkType["WHITESPACE"] = "WHITESPACE";
        ChunkType["DELIMITER"] = "DELIMITER";
        ChunkType["DOUBLE_QUOTED"] = "DOUBLE_QUOTED";
        ChunkType["SINGLE_QUOTED"] = "SINGLE_QUOTED";
        ChunkType["OTHER"] = "OTHER";
    })(ChunkType || (ChunkType = {}));
    class Chunk {
        content;
        type;
        constructor(content, type = ChunkType.OTHER) {
            this.content = content;
            this.type = type;
        }
        toString() {
            return this.content;
        }
    }
    class Chunker {
        chunks = [];
        delimiters;
        limit;
        buffer = '';
        inEscape = false;
        inDoubleQuote = false;
        inWhitespace = false;
        constructor(delimiters = '', limit = -1) {
            this.delimiters = delimiters.split('').reduce((acc, item) => {
                acc[item] = true;
                return acc;
            }, {});
            this.limit = limit;
        }
        append(s) {
            if (this.limitReached()) {
                return this;
            }
            const len = s.length;
            let i;
            for (i = 0; i < len; i++) {
                this.appendChar(s.charAt(i));
            }
            return this;
        }
        flush() {
            // flush buffer, reset state
            this.flushChunk();
            // empty chunks and return them
            return this.chunks.splice(0);
        }
        reset() {
            this.buffer = '';
            this.inDoubleQuote = false;
            this.inEscape = false;
            this.inWhitespace = false;
        }
        limitReached() {
            if (this.limit <= 0) {
                return false;
            }
            return this.chunks.length >= this.limit;
        }
        putChunk(chunk) {
            // stop if at limit
            if (this.limit > 0 && this.chunks.length >= this.limit) {
                return;
            }
            this.chunks.push(chunk);
        }
        flushChunk() {
            if (this.buffer.length > 0) {
                let type = ChunkType.OTHER;
                if (this.inWhitespace) {
                    type = ChunkType.WHITESPACE;
                }
                if (this.inDoubleQuote) {
                    type = ChunkType.DOUBLE_QUOTED;
                }
                this.putChunk(new Chunk(this.buffer, type));
            }
            this.reset();
        }
        appendChar(ch) {
            if (this.limitReached()) {
                return;
            }
            if (ch === '\\' && this.inEscape === false) {
                this.inEscape = true;
                return;
            }
            if (this.inEscape === true) {
                this.buffer += ch;
                this.inEscape = false;
                return;
            }
            // end of double-quoted string, or
            // start of quoted string
            if (ch === '"') {
                // flushing resets the `inDoubleQuote` flag, so we need to save the state for after
                const wasInDoubleQuote = this.inDoubleQuote;
                this.flushChunk();
                this.inDoubleQuote = !wasInDoubleQuote;
                return;
            }
            const charIsWhitespace = /\s/.test(ch);
            if (charIsWhitespace) {
                // if inside quoted string, just add the white space to buffer
                if (this.inDoubleQuote) {
                    this.buffer += ch;
                    return;
                }
                // if we are already in the middle of a sequence of white space, just add to buffer
                if (this.inWhitespace) {
                    this.buffer += ch;
                    return;
                }
                this.flushChunk();
                this.inWhitespace = true;
                this.buffer += ch;
                return;
            }
            // char is not whitespace, but prev char was whitespace
            if (!charIsWhitespace && this.inWhitespace && !this.inDoubleQuote) {
                // flush a whitespace chunk
                this.flushChunk();
            }
            // chunk delimiter characters
            if (this.delimiters[ch] === true) {
                if (this.inDoubleQuote) {
                    this.buffer += ch;
                    return;
                }
                // flush anything that was in the buffer
                this.flushChunk();
                // add a new chunk for this delimiter char
                this.putChunk(new Chunk(ch, ChunkType.DELIMITER));
                return;
            }
            this.buffer += ch;
        }
        static escape(value, charsToEscape) {
            const charMap = charsToEscape.split('').reduce((map, char) => {
                map[char] = true;
                return map;
            }, {});
            return value.split('')
                .map(char => charMap[char] ? ('\\' + char) : char)
                .join('');
        }
        static join(chunks) {
            return chunks.map(chunk => {
                if (chunk.type === ChunkType.DOUBLE_QUOTED) {
                    // escape slashes and double quotes
                    const escaped = Chunker.escape(chunk.content, '"\\');
                    return `"${escaped}"`;
                }
                else if (chunk.type === ChunkType.SINGLE_QUOTED) {
                    // escape slashes and single quotes
                    const escaped = Chunker.escape(chunk.content, "'\\");
                    return `'${escaped}'`;
                }
                return chunk.content;
            }).join('');
        }
    }

    const chunker = new Chunker('=');
    const isKeyValuePair = (item) => {
        return item && typeof item === 'object' && typeof item.key === 'string' && typeof item.value === 'string';
    };
    const parseKeyValuePairs = (s) => {
        chunker.append(s);
        const chunks = chunker.flush().filter(c => c.type !== ChunkType.WHITESPACE);
        const pairs = [];
        if (chunks.length < 2) {
            return [
                new Error(`Syntax error: Expected "key=value" syntax. Got ${chunks.map(a => a.toString()).join(' ')}`)
            ];
        }
        let i = chunks.length - 1;
        while (i > 0) {
            let key = chunks[i - 2] && chunks[i - 2].content, eq = chunks[i - 1] && chunks[i - 1].content, value = chunks[i] && chunks[i].content;
            // for blank values, e.g. "key="
            if (value === '=' && eq !== '=') {
                key = eq;
                eq = value;
                value = '';
                i = i - 2;
            }
            else {
                i = i - 3;
            }
            if (!key || (eq !== '=')) {
                pairs.push(new Error(`Syntax error: Expected "key=value" syntax. Got ${key}${eq}${value}`));
                continue;
            }
            pairs.push({
                key, value
            });
        }
        return pairs.reverse();
    };

    class UserDefinedAlias {
        command;
        constructor(command) {
            this.command = command;
        }
        async invoke(context) {
            const { cli, core } = context;
            return core.invokeCommand(this.command, cli);
        }
    }
    class AliasExecutor {
        disallowOverride = true;
        shortDescription = 'List and create aliases for commands';
        async invoke(context) {
            const { cli, core } = context;
            const args = context.args.trim();
            if (args.length > 0) {
                const pairs = parseKeyValuePairs(context.args);
                pairs.forEach(item => {
                    if (!isKeyValuePair(item)) {
                        cli.printerr(item.message);
                        return;
                    }
                    if (!item.value) {
                        cli.printerr(`Error: Alias ${item.key} cannot be empty. Maybe try using double quotes.`);
                        return;
                    }
                    try {
                        core.registerCommand(item.key, new UserDefinedAlias(item.value));
                    }
                    catch (e) {
                        cli.printerr(e.message);
                    }
                });
            }
            else {
                const registered = core.getRegisteredCommands();
                const aliases = Object.keys(registered)
                    .filter(key => registered[key] instanceof UserDefinedAlias);
                if (aliases.length > 0) {
                    aliases.forEach(key => {
                        const c = registered[key];
                        cli.println(key + '=' + c.command);
                    });
                }
                else {
                    cli.println('No aliases defined.');
                }
            }
            return 0;
        }
    }

    class EnvExecutor {
        shortDescription = 'Display environment values';
        async invoke(context) {
            const { cli, env } = context;
            env.keys().sort().forEach(key => {
                cli.println(key + '=' + env.getString(key));
            });
            return 0;
        }
    }

    var Formatter;
    (function (Formatter) {
        Formatter.pad = (str, width) => {
            const padding = new Array(width - str.length).fill(' ').join('');
            return str + padding;
        };
        Formatter.table = (rows, gap = 2) => {
            const widths = [];
            const gapStr = new Array(gap).fill(' ').join('');
            rows.forEach(cols => {
                cols.forEach((value, i) => {
                    widths[i] = Math.max(widths[i] || 0, value.length);
                });
            });
            return rows.map(cols => {
                return cols
                    .map((value, i) => Formatter.pad(value, widths[i]))
                    .join(gapStr);
            }).join('\n');
        };
    })(Formatter || (Formatter = {}));

    class HelpExecutor {
        shortDescription = 'Prints this message';
        help = new Array(1024).fill('help').join(' ');
        async invoke(context) {
            const { core, cli, env, args } = context;
            const commands = core.getRegisteredCommands();
            const tab = env.getString('TAB');
            const arg = args.trim();
            if (arg) {
                if (commands[arg]) {
                    if (commands[arg].help) {
                        cli.println(commands[arg].help);
                    }
                    else {
                        cli.printerr(`Command "${arg}" has not provided additional help info.`);
                    }
                }
                else {
                    cli.printerr(`Unknown command "${arg}".`);
                }
            }
            else { // no specific command requested
                cli.println('Use "help [command]" to get more info on a specific command.\n');
                cli.println('Available commands:\n');
                const values = Object.keys(commands).sort()
                    .filter(cmd => !!commands[cmd].shortDescription)
                    .map(cmd => {
                    return [tab + cmd, commands[cmd].shortDescription];
                });
                const table = Formatter.table(values);
                cli.println(table);
            }
            return 0;
        }
    }

    const HISTORY_COMMANDS = {
        history: {
            shortDescription: 'List previously used commands',
            help: [
                'Usage:',
                '  history [--clear]',
                '',
                'With no arguments, displays your previously used commands up to $HISTORY_MAX.',
                '',
                'When the --clear argument is supplied, clears your stored history.'
            ].join('\n'),
            invoke: async (context) => {
                const { cli, args } = context;
                if (args.trim() === '--clear') {
                    cli.clearHistory();
                }
                else {
                    cli.getHistory().forEach((line, i) => cli.println(i, line));
                }
                return 0;
            }
        }
    };

    const ENV_KEY_TEST_PATTERN = /^[A-Za-z0-9_-]+$/;
    class SetExecutor {
        shortDescription = 'Set an environment value';
        async invoke(context) {
            const { cli, env } = context;
            const pairs = parseKeyValuePairs(context.args);
            pairs.forEach(pair => {
                if (isKeyValuePair(pair)) {
                    if (ENV_KEY_TEST_PATTERN.test(pair.key)) {
                        env.put(pair.key, pair.value);
                    }
                    else {
                        cli.printerr(`Error: ${pair.key} must match pattern ${ENV_KEY_TEST_PATTERN.toString()}`);
                    }
                }
                else {
                    cli.printerr(pair.message);
                }
            });
            return 0;
        }
    }

    const ENV_REPLACE_PATTERN = /\$([a-zA-Z0-9_-]+)/g;
    class Environment {
        env;
        constructor(initial = {}) {
            this.env = initial;
        }
        keys() {
            return Object.keys(this.env);
        }
        getString(key) {
            return this.env[key] || '';
        }
        getNumber(key) {
            return (+this.env[key]) || 0;
        }
        put(key, value) {
            if (!key) {
                throw new Error('Error: Cannot put empty key in environment.');
            }
            this.env[key] = this.stringify(value);
        }
        interpolate(s) {
            return s.replace(ENV_REPLACE_PATTERN, (raw, key) => {
                return (this.env.hasOwnProperty(key) ? this.env[key] : raw);
            });
        }
        stringify(value) {
            const type = typeof value;
            if (type === 'string') {
                return value;
            }
            if (type === 'boolean' || type === 'number') {
                return value.toString();
            }
            if (value) {
                return JSON.stringify(value);
            }
            return '';
        }
    }

    const CWD_ENV_VAR = 'CWD';
    const SEPARATOR = '/';
    class PotatoFS {
        root;
        environment;
        constructor(root, environment) {
            this.root = root;
            this.environment = environment;
        }
        static isRelative(path) {
            return path.charAt(0) !== SEPARATOR;
        }
        static join(...parts) {
            return parts.join(SEPARATOR).replace(/\/+/g, SEPARATOR);
        }
        static isDir(node) {
            return node && node.hasOwnProperty('children');
        }
        static isFile(node) {
            return node && node.hasOwnProperty('blob');
        }
        static splitPath(path) {
            const split = path.split(SEPARATOR);
            const hasTrailingEmpty = split[split.length - 1] === '';
            return hasTrailingEmpty ? split.slice(0, -1) : split;
        }
        static getAbsolutePath(node) {
            const stack = [];
            let n = node;
            while (n) {
                stack.push(n.name);
                n = n.parent;
            }
            return stack.reverse().join(SEPARATOR);
        }
        static async getText(node) {
            return new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = e => {
                    resolve(e.target.result);
                };
                reader.readAsText(node.blob);
            });
        }
        static async getDataURL(node) {
            return new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = e => {
                    resolve(e.target.result);
                };
                reader.readAsDataURL(node.blob);
            });
        }
        resolve(path) {
            const relative = PotatoFS.isRelative(path);
            const resolved = relative ? PotatoFS.join(this.cwd(), path) : path;
            const split = resolved.split(SEPARATOR);
            const stack = [];
            for (let i = 0; i < split.length; i++) {
                const segment = split[i];
                if (segment === '.' || segment === '') {
                    continue;
                }
                if (segment === '..') {
                    stack.pop();
                    continue;
                }
                stack.push(segment);
            }
            return SEPARATOR + stack.join(SEPARATOR);
        }
        cd(path) {
            const resolved = this.resolve(path);
            const node = this.get(resolved);
            if (node) {
                this.environment.put(CWD_ENV_VAR, resolved);
            }
            else {
                throw new Error('Invalid path: ' + path);
            }
        }
        cwd() {
            return this.environment.getString(CWD_ENV_VAR);
        }
        get(path) {
            // e.g. '/foo/bar/baz.txt' or '/foo/qux'
            const resolved = this.resolve(path);
            // e.g. ['', 'foo', 'bar', 'baz.txt'] or ['', 'foo', 'qux']
            const segments = PotatoFS.splitPath(resolved);
            if (segments[0] !== '') {
                throw new Error(`Unexpected node value: ${segments[0]}`);
            }
            let node = this.root;
            segments.shift(); // remove root node
            while (segments.length > 0) {
                if (!PotatoFS.isDir(node)) {
                    throw new Error(`Unexpected non-directory node "${node.name}"`);
                }
                const name = segments.shift();
                const found = name && node.children[name];
                if (found) {
                    node = found;
                }
                else {
                    throw new Error(`No node named "${name}" found in parent "${node.name}".`);
                }
            }
            return node;
        }
        mkdirp(path) {
            // e.g. '/foo/bar/baz.txt' or '/foo/qux'
            const resolved = this.resolve(path);
            // e.g. ['', 'foo', 'bar', 'baz.txt'] or ['', 'foo', 'qux']
            const segments = PotatoFS.splitPath(resolved);
            if (segments[0] !== '') {
                throw new Error(`Unexpected node value: ${segments[0]}`);
            }
            let node = this.root;
            segments.shift(); // remove root node
            while (segments.length > 0) {
                if (!PotatoFS.isDir(node)) {
                    throw new Error(`Unexpected non-directory node "${node.name}"`);
                }
                const name = segments.shift();
                const found = name && node.children[name];
                if (found) {
                    node = found;
                }
                else {
                    const created = {
                        name: name,
                        parent: node,
                        children: {},
                    };
                    this.put(node, created);
                    node = created;
                }
            }
            return node;
        }
        list(path) {
            const node = this.get(path);
            if (PotatoFS.isDir(node)) {
                return Object.values(node.children);
            }
            else {
                return [node];
            }
        }
        put(parent, child) {
            if (parent.children.hasOwnProperty(child.name)) {
                throw new Error(`${parent.name} already contains a file named ${child.name}`);
            }
            parent.children[child.name] = child;
        }
    }

    const FS_COMMANDS = {
        cat: {
            shortDescription: 'Show contents of a text file',
            help: [
                'Usage:',
                '  cat [file path]',
                '',
                'Dumps the contents of a text file to the screen.'
            ].join('\n'),
            invoke: async (context) => {
                const { args, fs, cli } = context;
                const node = fs.get(args.trim());
                if (!PotatoFS.isFile(node)) {
                    cli.printerr(`"${node.name}" is not a file.`);
                    return 1;
                }
                return PotatoFS.getText(node)
                    .then(text => cli.println(text))
                    .then(() => 0);
            }
        },
        cd: {
            shortDescription: 'Change current working directory',
            help: [
                'Usage:',
                '  cd [path]',
                '',
                'Change the current working directory.'
            ].join('\n'),
            invoke: async (context) => {
                const { args, fs } = context;
                fs.cd(args.trim());
                return 0;
            }
        },
        download: {
            shortDescription: 'Download a file to your computer',
            help: [
                'Usage:',
                '  download [file or path]',
                '',
                'Allows you to download files from PotatoFS to your computer.',
            ].join('\n'),
            invoke: async (context) => {
                const { args, fs, cli } = context;
                const node = fs.get(args.trim());
                if (!PotatoFS.isFile(node)) {
                    cli.printerr(`"${node.name}" is not a file.`);
                    return 1;
                }
                cli.println('Preparing your download, just a sec.');
                return PotatoFS.getDataURL(node)
                    .then(url => {
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = node.name;
                    a.click();
                })
                    .then(() => 0);
            }
        },
        ls: {
            shortDescription: 'List files and folders',
            help: [
                'Usage:',
                '  ls [path?]',
                '',
                'List contents of path, or the current working directory if no path provided.'
            ].join('\n'),
            invoke: async (context) => {
                const { cli, args, fs, env } = context;
                const nodes = fs.list(args.trim());
                nodes.forEach(node => {
                    cli.println(node.name);
                });
                return 0;
            }
        },
        mkdirp: {
            shortDescription: 'Create directories',
            help: [
                'Usage:',
                '  mkdirp [path]',
                '',
                'Create the provided path if it does not exist.'
            ].join('\n'),
            invoke: async (context) => {
                const { args, fs } = context;
                fs.mkdirp(args.trim());
                return 0;
            }
        },
        pwd: {
            shortDescription: 'Print current working directory',
            invoke: async (context) => {
                const { cli, fs } = context;
                cli.println(fs.cwd());
                return 0;
            }
        },
        rm: {
            shortDescription: 'Remove a file',
            invoke: async (context) => {
                const { args, fs, cli } = context;
                const node = fs.get(args.trim());
                if (PotatoFS.isFile(node)) {
                    delete node.parent.children[node.name];
                }
                else {
                    cli.printerr(`${node.name} is not a file.`);
                    return 1;
                }
                return 0;
            }
        },
        upload: {
            shortDescription: 'Upload a file to the current directory',
            help: [
                'Usage:',
                '  upload',
                '',
                'Allows you to upload files to PotatoFS from your computer.',
                'Files are uploaded to the current directory.'
            ].join('\n'),
            invoke: async (context) => {
                const { fs, cli } = context;
                const input = document.createElement('input');
                input.type = 'file';
                input.multiple = true;
                input.addEventListener('change', () => {
                    const files = Array.prototype.slice.call(input.files);
                    cli.println(`Uploading ${files.length} file(s).`);
                    files.forEach(file => {
                        const cwd = fs.get(fs.cwd());
                        const fsnode = {
                            name: file.name,
                            parent: cwd,
                            blob: file
                        };
                        fs.put(cwd, fsnode);
                        cli.println(`${file.name} (${file.size} bytes) uploaded to ${fs.cwd()}`);
                    });
                });
                input.click();
                return 0;
            }
        }
    };

    const TITLE = `
▀██▀▀█▄   ▀██                  ▀██       ██                 ▀██      
 ██   ██   ██   ▄▄▄▄     ▄▄▄▄   ██  ▄▄  ▄▄▄  ▄▄▄▄     ▄▄▄▄   ██  ▄▄  
 ██▀▀▀█▄   ██  ▀▀ ▄██  ▄█   ▀▀  ██ ▄▀    ██ ▀▀ ▄██  ▄█   ▀▀  ██ ▄▀   
 ██    ██  ██  ▄█▀ ██  ██       ██▀█▄    ██ ▄█▀ ██  ██       ██▀█▄   
▄██▄▄▄█▀  ▄██▄ ▀█▄▄▀█▀  ▀█▄▄▄▀ ▄██▄ ██▄  ██ ▀█▄▄▀█▀  ▀█▄▄▄▀ ▄██▄ ██▄ 
                                      ▄▄ █▀                          
                                       ▀▀                            `;
    const DIVIDER = '════════════════════════════╡ ♥♦♠♣ ╞════════════════════════════';
    const HIDDEN_CARD = {
        suit: '♠',
        display: '?',
        value: 0
    };
    const SUITS = ['♥', '♦', '♠', '♣'];
    const sortedDeck = SUITS.map(suit => {
        return [
            2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A'
        ].map(display => ({
            suit,
            display: display.toString(),
            value: typeof display === 'number' ? display : (display === 'A' ? 1 : 10)
        }));
    }).reduce((all, cards) => all.concat(cards), []);
    const shuffle = (cards) => {
        const shuffler = () => 0.5 - Math.random();
        const shuffled = cards.slice();
        shuffled.sort(shuffler);
        shuffled.sort(shuffler);
        shuffled.sort(shuffler);
        return shuffled;
    };
    const BLACKJACK = 21;
    const calcHand = (cards) => {
        let aces = 0;
        let sum = 0;
        cards.forEach(c => {
            sum += c.value;
            aces += (c.display === 'A' ? 1 : 0);
        });
        while (aces-- && (sum + 10) <= BLACKJACK) {
            sum += 10;
        }
        return sum;
    };
    const printHand = (cards) => {
        const gap = ' ';
        const lines = [
            cards.map(c => `╭─────╮`).join(gap),
            cards.map(c => c.display === '?' ? '│░░░░░│' : `│${Formatter.pad(c.display, 2)}   │`).join(gap),
            cards.map(c => c.display === '?' ? '│░░░░░│' : `│  ${c.suit}  │`).join(gap),
            cards.map(c => c.display === '?' ? '│░░░░░│' : `│     │`).join(gap),
            cards.map(c => `╰─────╯`).join(gap)
        ];
        return lines.join('\n');
    };
    const menu = (cli, prompt, options, defaultOption, inputModifier) => {
        const loop = () => cli.readln(prompt)
            .then(input => inputModifier ? inputModifier(input) : input)
            .then(input => {
            if (options.hasOwnProperty(input)) {
                return options[input].call(undefined);
            }
            else {
                return defaultOption ? defaultOption() : loop();
            }
        });
        return loop();
    };
    const game = async (context) => new Promise(exit => {
        const { cli } = context;
        cli.println(DIVIDER);
        const deck = shuffle(sortedDeck);
        const dealerHand = [
            deck.pop(),
            deck.pop()
        ];
        const playerHand = [
            deck.pop(),
            deck.pop()
        ];
        const endGame = () => {
            const dealerSum = calcHand(dealerHand);
            const playerSum = calcHand(playerHand);
            if (dealerSum > BLACKJACK) {
                cli.println('Dealer busts! You win!');
            }
            else if (playerSum > BLACKJACK) {
                cli.println('You busted! Dealer wins.');
            }
            else if (playerSum === dealerSum) {
                cli.println('Push.');
            }
            else if (playerSum > dealerSum) {
                cli.println('You win!');
            }
            else {
                cli.println('You lost.');
            }
            menu(cli, 'Play again? (Y/N)', {
                Y: async () => game(context).then(exit),
                N: async () => exit()
            }, undefined, s => s.toUpperCase());
        };
        const stay = () => {
            const dealerSum = calcHand(dealerHand);
            const playerSum = calcHand(playerHand);
            cli.println(`Dealer hand (${dealerSum}):\n${printHand(dealerHand)}`);
            cli.println(`Your hand (${playerSum}):\n${printHand(playerHand)}\n`);
            if (dealerSum >= 17) {
                endGame();
            }
            else {
                cli.println(`Dealer hits.\n`);
                dealerHand.push(deck.pop());
                // add a little delay
                setTimeout(stay, 1200);
            }
        };
        const loop = () => {
            // before player stays, they can only see the first card drawn by dealer
            const dealerVisible = dealerHand.slice(0, 1).concat(HIDDEN_CARD);
            const dealerSum = calcHand(dealerVisible);
            const playerSum = calcHand(playerHand);
            cli.println(`Dealer hand (${dealerSum}):\n${printHand(dealerVisible)}`);
            cli.println(`Your hand (${playerSum}):\n${printHand(playerHand)}\n`);
            if (playerSum === BLACKJACK) {
                stay();
            }
            else if (playerSum > BLACKJACK) {
                endGame();
            }
            else {
                menu(cli, '(H)it, (S)tay, or (Q)uit?', {
                    H: async () => {
                        playerHand.push(deck.pop());
                        loop();
                    },
                    S: async () => stay(),
                    Q: async () => exit(),
                }, undefined, s => s.toUpperCase());
            }
        };
        loop();
    });
    const BlackjackExecutor = {
        shortDescription: 'Play a game of Blackjack, no chips required',
        invoke: async (context) => {
            const { cli } = context;
            cli.println(TITLE);
            return game(context).then(() => {
                cli.println(DIVIDER);
                cli.println('Thanks for playing!');
                return 0;
            });
        }
    };

    const FILESYSTEM_ROOT = {
        "name": "",
        "children": {
            "apps": {
                "name": "apps",
                "children": {
                    "README.md": {
                        "name": "README.md",
                        "blob": "data:text/plain;base64,UG90YXRPUyBzdXBwb3J0cyBIVE1MICJhcHBzIiB0aGF0IGhhdmUgYWNjZXNzIHRvIHRoZSBPUyBBUElzIHZpYSBhbiBpbmplY3RlZCBgUG90YXRPU2AgZ2xvYmFsLgoKVHJ5IHJ1bm5pbmcgdGhlIGV4YW1wbGUgYXBwIHZpYSB0aGUgYGh0bWxgIGNvbW1hbmQ6CgpgYGAKaHRtbCBleGFtcGxlLmh0bWwKYGBg"
                    },
                    "edit.html": {
                        "name": "edit.html",
                        "blob": "data:text/html;base64,PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9ImVuIj4KPGhlYWQ+CiAgICA8bWV0YSBjaGFyc2V0PSJVVEYtOCI+CiAgICA8bWV0YSBodHRwLWVxdWl2PSJYLVVBLUNvbXBhdGlibGUiIGNvbnRlbnQ9IklFPWVkZ2UiPgogICAgPG1ldGEgbmFtZT0idmlld3BvcnQiIGNvbnRlbnQ9IndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xLjAiPgogICAgPHRpdGxlPkVkaXRvcjwvdGl0bGU+CiAgICA8c3R5bGU+CiAgICAgICAgOnJvb3QgewogICAgICAgICAgICAtLWdhcDogLjc1cmVtOwogICAgICAgIH0KICAgICAgICAjbWFpbiB7CiAgICAgICAgICAgIHBvc2l0aW9uOiBmaXhlZDsKICAgICAgICAgICAgdG9wOiAwOwogICAgICAgICAgICByaWdodDogMDsKICAgICAgICAgICAgYm90dG9tOiAwOwogICAgICAgICAgICBsZWZ0OiAwOwoKICAgICAgICAgICAgZGlzcGxheTogZ3JpZDsKICAgICAgICAgICAgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiAxZnI7CiAgICAgICAgICAgIGdyaWQtdGVtcGxhdGUtcm93czogYXV0byAxZnIgYXV0bzsKICAgICAgICAgICAgZ2FwOiB2YXIoLS1nYXApOwogICAgICAgIH0KICAgICAgICAjY29udGVudCB7CiAgICAgICAgICAgIHdoaXRlLXNwYWNlOiBwcmUtd3JhcDsKICAgICAgICAgICAgb3V0bGluZTogbm9uZTsKICAgICAgICB9CiAgICAgICAgaGVhZGVyIHsKICAgICAgICAgICAgYm9yZGVyLWJvdHRvbTogMXB4IGRvdWJsZTsKICAgICAgICAgICAgcGFkZGluZy1ib3R0b206IHZhcigtLWdhcCk7CiAgICAgICAgfQogICAgICAgIGZvb3RlciB7CiAgICAgICAgICAgIGJvcmRlci10b3A6IDFweCBkb3VibGU7CiAgICAgICAgICAgIHBhZGRpbmctdG9wOiB2YXIoLS1nYXApOwogICAgICAgIH0KICAgIDwvc3R5bGU+CjwvaGVhZD4KPGJvZHkgZGF0YS10aGVtZT0iaW5oZXJpdCI+CiAgICA8ZGl2IGlkPSJtYWluIj4KICAgICAgICA8aGVhZGVyPgogICAgICAgICAgICA8ZGl2IGlkPSJmaWxlbmFtZSI+PC9kaXY+CiAgICAgICAgPC9oZWFkZXI+CiAgICAgICAgPGRpdiBpZD0iY29udGVudCIgY29udGVudGVkaXRhYmxlPjwvZGl2PgogICAgICAgIDxmb290ZXI+CiAgICAgICAgICAgIDxidXR0b24gaWQ9InNhdmUiPlNhdmU8L2J1dHRvbj4KICAgICAgICAgICAgPGJ1dHRvbiBpZD0iZXhpdCI+RXhpdDwvYnV0dG9uPgogICAgICAgIDwvZm9vdGVyPgogICAgPC9kaXY+CgogICAgPHNjcmlwdD4KICAgICAgICBjb25zdCBjb250ZW50RWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb250ZW50Jyk7CiAgICAgICAgY29uc3QgUG90YXRvRlMgPSBQb3RhdE9TLlBvdGF0b0ZTOwogICAgICAgIGNvbnN0IGNvbnRleHQgPSBQb3RhdE9TLmNvbnRleHQ7CiAgICAgICAgY29uc3Qgbm9kZSA9IGNvbnRleHQuZnMuZ2V0KGNvbnRleHQuYXJncy50cmltKCkpOwogICAgICAgIGxldCBzYXZlZENvbnRlbnQ7CgogICAgICAgIGNvbnN0IHNhdmUgPSAoKSA9PiB7CiAgICAgICAgICAgIGNvbnN0IHRleHQgPSBjb250ZW50RWxlbWVudC50ZXh0Q29udGVudDsKCiAgICAgICAgICAgIGlmICh0ZXh0ID09PSBzYXZlZENvbnRlbnQpIHsKICAgICAgICAgICAgICAgIHJldHVybjsKICAgICAgICAgICAgfQoKICAgICAgICAgICAgY29uc3QgYmxvYiA9IG5ldyBCbG9iKFt0ZXh0XSwge3R5cGU6IG5vZGUuYmxvYi50eXBlfSk7CiAgICAgICAgICAgIG5vZGUuYmxvYiA9IGJsb2I7CiAgICAgICAgICAgIHNhdmVkQ29udGVudCA9IHRleHQ7CiAgICAgICAgfTsKCiAgICAgICAgaWYgKCFQb3RhdG9GUy5pc0ZpbGUobm9kZSkpIHsKICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAiJHtub2RlLm5hbWV9IiBpcyBub3QgYSBmaWxlLmApOwogICAgICAgIH0KCiAgICAgICAgUG90YXRvRlMuZ2V0VGV4dChub2RlKS50aGVuKHRleHQgPT4gewogICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZmlsZW5hbWUnKS50ZXh0Q29udGVudCA9IFBvdGF0b0ZTLmdldEFic29sdXRlUGF0aChub2RlKTsKCiAgICAgICAgICAgIGNvbnRlbnRFbGVtZW50LnRleHRDb250ZW50ID0gdGV4dDsKICAgICAgICAgICAgc2F2ZWRDb250ZW50ID0gdGV4dDsKICAgICAgICB9KTsKCiAgICAgICAgY29udGVudEVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCBlID0+IHsKICAgICAgICAgICAgY29uc3QgYnJzID0gY29udGVudEVsZW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2JyJyk7CiAgICAgICAgICAgIGxldCBpID0gYnJzLmxlbmd0aDsKICAgICAgICAgICAgd2hpbGUgKGktLSkgewogICAgICAgICAgICAgICAgY29uc3QgbiA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCJcbiIpOwogICAgICAgICAgICAgICAgYnJzW2ldLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKG4sIGJyc1tpXSk7CiAgICAgICAgICAgIH0KICAgICAgICB9KTsKCiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NhdmUnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGUgPT4gewogICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7CiAgICAgICAgICAgIHNhdmUoKTsKICAgICAgICB9KTsKCiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2V4aXQnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGUgPT4gewogICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7CiAgICAgICAgICAgIFBvdGF0T1MuZXhpdCgpOwogICAgICAgIH0pOwogICAgPC9zY3JpcHQ+CjwvYm9keT4KPC9odG1sPg=="
                    },
                    "example.html": {
                        "name": "example.html",
                        "blob": "data:text/html;base64,PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9ImVuIj4KPGhlYWQ+CiAgICA8bWV0YSBjaGFyc2V0PSJVVEYtOCI+CiAgICA8bWV0YSBodHRwLWVxdWl2PSJYLVVBLUNvbXBhdGlibGUiIGNvbnRlbnQ9IklFPWVkZ2UiPgogICAgPG1ldGEgbmFtZT0idmlld3BvcnQiIGNvbnRlbnQ9IndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xLjAiPgogICAgPHRpdGxlPkV4YW1wbGUgQXBwPC90aXRsZT4KICAgIDxzdHlsZT4KICAgICAgICAuYm94IHsKICAgICAgICAgICAgcGFkZGluZzogMnJlbTsKICAgICAgICAgICAgbWFyZ2luOiAycmVtIGF1dG87CiAgICAgICAgICAgIHdpZHRoOiA0MHZ3OwogICAgICAgICAgICBib3JkZXI6IDJweCBkb3VibGU7CiAgICAgICAgICAgIHRleHQtYWxpZ246IGNlbnRlcjsKICAgICAgICB9CiAgICA8L3N0eWxlPgo8L2hlYWQ+Cjxib2R5IGRhdGEtdGhlbWU9ImluaGVyaXQiPgogICAgPGRpdiBjbGFzcz0iYm94Ij4KICAgICAgICA8cD5UaGlzIGlzIGEgc2ltcGxlIGV4YW1wbGUgSFRNTCAiYXBwIi48L3A+CiAgICAgICAgPHA+SXQgcnVucyBpbiBpdHMgb3duIGlmcmFtZSwgYnV0IGhhcyBhY2Nlc3MgdG8gdmFyaW91cyBBUElzLjwvcD4KICAgICAgICA8cD4KICAgICAgICAgICAgPGJ1dHRvbiBpZD0iZXhpdCI+RXhpdDwvYnV0dG9uPgogICAgICAgIDwvcD4KICAgIDwvZGl2PgoKICAgIDxzY3JpcHQ+CiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2V4aXQnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGUgPT4gewogICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7CiAgICAgICAgICAgIFBvdGF0T1MuZXhpdCgpOwogICAgICAgIH0pOwogICAgPC9zY3JpcHQ+CjwvYm9keT4KPC9odG1sPg=="
                    }
                }
            },
            "home": {
                "name": "home",
                "children": {
                    "$USER": {
                        "name": "$USER",
                        "children": {}
                    }
                }
            },
            "tmp": {
                "name": "tmp",
                "children": {
                    "test.txt": {
                        "name": "test.txt",
                        "blob": "data:text/plain;base64,aGVsbG8h"
                    }
                }
            }
        }
    };

    const OSID = '🥔 PotatOS 0.1b';
    const commandChunker = new Chunker('', 1);
    // lifted from: https://stackoverflow.com/a/30407959
    const dataURLtoBlob = (dataurl) => {
        var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1], bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    };
    const deserializeFS = (item, nodepath, parent, env) => {
        const node = {
            // make a copy, don't mutate original
            ...item,
            // expand env variables in names
            name: env.interpolate(item.name),
            parent,
        };
        if (PotatoFS.isDir(node)) {
            node.children = Object.keys(node.children).map(name => {
                const child = node.children[name];
                const childPath = PotatoFS.join(nodepath, name);
                return deserializeFS(child, childPath, node, env);
            }).reduce((map, child) => {
                map[child.name] = child;
                return map;
            }, {});
        }
        else if (PotatoFS.isFile(node)) {
            if (typeof node.blob === 'string') {
                node.blob = dataURLtoBlob(node.blob);
            }
        }
        else {
            throw new Error('Error initializing file system. Unknown node type: ' + JSON.stringify(node));
        }
        return node;
    };
    const createDefaultFileSystem = (env) => {
        const root = deserializeFS(FILESYSTEM_ROOT, '/', undefined, env);
        return new PotatoFS(root, env);
    };
    class OSCore {
        environment;
        fs;
        commands;
        constructor() {
            this.environment = new Environment({
                [CWD_ENV_VAR]: '/',
                USER: 'spud',
                TAB: '  '
            });
            this.fs = createDefaultFileSystem(this.environment);
            this.commands = {
                alias: new AliasExecutor(),
                blackjack: BlackjackExecutor,
                env: new EnvExecutor(),
                help: new HelpExecutor(),
                set: new SetExecutor(),
                about: {
                    shortDescription: 'About this project',
                    invoke: async (context) => {
                        const { cli } = context;
                        cli.println(OSID);
                        cli.println(new Array(80).fill('═').join(''));
                        cli.println(Formatter.table([
                            ['Source code', 'https://github.com/dgrundel/PotatOS'],
                            ['Browser support', 'Recent versions of modern browsers.'],
                        ], 4));
                        return 0;
                    }
                },
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
                        const { cli, env } = context;
                        const str = env.interpolate(context.args);
                        cli.println(str);
                        return 0;
                    }
                },
                html: {
                    shortDescription: 'Run an HTML "app"',
                    invoke: async (context) => {
                        const { cli, args } = context;
                        const chunks = new Chunker().append(args.trim()).flush();
                        const htmlPath = chunks.shift().content; // remove html file path from chunks
                        const htmlArgs = Chunker.join(chunks);
                        const htmlContext = {
                            ...context,
                            args: htmlArgs
                        };
                        return cli.invokeHtml(htmlPath, htmlContext);
                    }
                },
                potato: {
                    shortDescription: 'Print a cute, little potato',
                    invoke: async (context) => {
                        context.cli.println('🥔');
                        return 0;
                    }
                },
                sleep: {
                    shortDescription: 'Wait a while',
                    invoke: async (context) => new Promise(resolve => {
                        const { cli, args } = context;
                        const seconds = +(args.trim());
                        if (seconds > 0) {
                            cli.println(`Sleeping for ${seconds} seconds.`);
                            setTimeout(resolve, seconds * 1000);
                        }
                    })
                },
                ...HISTORY_COMMANDS,
                ...FS_COMMANDS,
            };
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
        async invokeCommand(line, cli) {
            const cmd = commandChunker.append(line).flush()[0].content;
            // run command
            if (this.commands.hasOwnProperty(cmd)) {
                const executor = this.commands[cmd];
                const args = line.substring(cmd.length).trim();
                try {
                    return executor.invoke({
                        command: cmd,
                        args,
                        cli,
                        env: this.environment,
                        fs: this.fs,
                        core: this
                    }).catch(err => {
                        return err;
                    });
                }
                catch (e) {
                    return e;
                }
            }
            return new Error(`Unknown command "${cmd}"\nType "help" if you need some.`);
        }
    }

    const PROMPT_ENV_VAR = 'PROMPT';
    const HISTORY_MAX_ENV_VAR = 'HISTORY_MAX';
    const HISTORY_STORAGE_KEY = 'POTATOS_CLI_HISTORY';
    class CLI {
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
        clearHistory() {
            this.history.splice(0);
            this.storeHistory();
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
        async invokeHtml(path, context) {
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
                this.output.parentNode.appendChild(iframe);
                // link base styles
                iframe.addEventListener('load', () => {
                    const framedoc = iframe.contentDocument;
                    const link = document.createElement('link');
                    link.setAttribute('type', 'text/css');
                    link.setAttribute('rel', 'stylesheet');
                    link.setAttribute('href', './public/base-style.css');
                    framedoc.head.appendChild(link);
                    if (framedoc.body.dataset.theme === 'inherit') {
                        framedoc.body.dataset.theme = document.body.dataset.theme;
                    }
                    // once styles are loaded, show iframe
                    link.onload = () => {
                        iframe.style.visibility = 'visible';
                    };
                });
                // set iframe content, which will trigger load event
                iframe.srcdoc = text;
                return iframe;
            })
                .then(iframe => new Promise(resolve => {
                const framewindow = iframe.contentWindow;
                const exit = (err) => {
                    iframe.parentNode.removeChild(iframe);
                    this.output.style.visibility = 'visible';
                    resolve(err ? new Error(`App exited with error: ${err}`) : undefined);
                };
                framewindow.PotatOS = {
                    Chunker,
                    PotatoFS,
                    context,
                    exit
                };
                // exit if unhandled error occurs
                framewindow.addEventListener('error', e => {
                    exit(e.message);
                });
            }))
                .then(err => err || 0);
        }
        storeHistory() {
            if (window.localStorage) {
                localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(this.history));
            }
        }
        focusInput() {
            this.input.focus();
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
                this.storeHistory();
            }
        }
        ;
        init() {
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
                        }
                        else {
                            throw new Error(`"${historyJson}" is not a JSON array.`);
                        }
                    }
                    catch (e) {
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
            const awaitInput = () => {
                return this.readln(this.getPrompt(), this.history)
                    .then(line => this.invokeInput(line))
                    .then(awaitInput);
            };
            awaitInput();
        }
    }

    exports.CLI = CLI;
    exports.HISTORY_MAX_ENV_VAR = HISTORY_MAX_ENV_VAR;
    exports.OSCore = OSCore;
    exports.OSID = OSID;
    exports.PROMPT_ENV_VAR = PROMPT_ENV_VAR;

}));
