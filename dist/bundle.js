(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.PotatOS = {}));
})(this, (function (exports) { 'use strict';

    var ChunkType;
    (function (ChunkType) {
        ChunkType[ChunkType["WHITESPACE"] = 0] = "WHITESPACE";
        ChunkType[ChunkType["DELIMITER"] = 1] = "DELIMITER";
        ChunkType[ChunkType["DOUBLE_QUOTED"] = 2] = "DOUBLE_QUOTED";
        ChunkType[ChunkType["SINGLE_QUOTED"] = 3] = "SINGLE_QUOTED";
        ChunkType[ChunkType["OTHER"] = 4] = "OTHER";
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
                Object.keys(commands).sort()
                    .filter(cmd => !!commands[cmd].shortDescription)
                    .forEach(cmd => {
                    cli.println(tab + cmd + ' - ' + commands[cmd].shortDescription);
                });
            }
            return 0;
        }
    }

    class HistoryExecutor {
        shortDescription = 'List previously used commands';
        async invoke(context) {
            const cli = context.cli;
            cli.getHistory().forEach((line, i) => cli.println(i, line));
            return 0;
        }
    }

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
            // TODO: make smarter, check for relative paths, dots, etc. Check first part for relative
            return parts.join(SEPARATOR).replace(/\/\//g, SEPARATOR);
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
                const found = node.children.find(child => child.name === name);
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
                const found = node.children.find(child => child.name === name);
                if (found) {
                    node = found;
                }
                else {
                    const created = {
                        name: name,
                        parent: node,
                        children: [],
                    };
                    node.children.push(created);
                    node = created;
                }
            }
            return node;
        }
        list(path) {
            const node = this.get(path);
            if (PotatoFS.isDir(node)) {
                return node.children.slice();
            }
            else {
                return [node];
            }
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
                return new Promise(resolve => {
                    const node = fs.get(args.trim());
                    if (PotatoFS.isFile(node)) {
                        const reader = new FileReader();
                        reader.onload = e => {
                            cli.println(e.target.result);
                            resolve(0);
                        };
                        reader.readAsText(node.blob);
                    }
                    else {
                        cli.printerr(`"${node.name}" is not a file.`);
                        resolve(1);
                    }
                });
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
                if (PotatoFS.isFile(node)) {
                    cli.println('Preparing your download, just a sec.');
                    const reader = new FileReader();
                    reader.onload = e => {
                        const a = document.createElement('a');
                        a.href = e.target.result;
                        a.download = node.name;
                        a.click();
                    };
                    reader.readAsDataURL(node.blob);
                    return 0;
                }
                cli.printerr(`"${node.name}" is not a file.`);
                return 1;
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
                    const i = node.parent.children.findIndex(n => n === node);
                    if (i !== -1) {
                        node.parent.children.splice(i, 1);
                    }
                    else {
                        // wtf
                        cli.printerr(`Internal error.`);
                        return 1;
                    }
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
                        cwd.children.push(fsnode);
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
    const suits = ['♥', '♦', '♠', '♣'];
    const sortedDeck = suits.map(suit => {
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
        const sum = calcHand(cards);
        const list = cards.map(c => `${c.display}${c.suit}`).join(', ');
        return `${list} (${sum})`;
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
            const playerSum = calcHand(playerHand);
            const dealerSum = calcHand(dealerHand);
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
            cli.println(`Dealer has ${printHand(dealerHand)}.`);
            cli.println(`You have ${printHand(playerHand)}.\n`);
            const dealerSum = calcHand(dealerHand);
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
            const dealerVisible = dealerHand.slice(0, 1);
            cli.println(`Dealer has ${printHand(dealerVisible)} visible.`);
            cli.println(`You have ${printHand(playerHand)}.\n`);
            const playerSum = calcHand(playerHand);
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

    const OSID = '🥔 PotatOS 0.1b';
    const commandChunker = new Chunker('', 1);
    const createDefaultFileSystem = (env) => {
        const fs = new PotatoFS({ name: '', children: [] }, env);
        const homedir = env.interpolate('/home/$USER');
        fs.mkdirp(homedir);
        fs.mkdirp('/tmp');
        fs.cd(homedir);
        return fs;
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
                history: new HistoryExecutor(),
                set: new SetExecutor(),
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
                        const cli = context.cli;
                        const env = context.env;
                        const str = env.interpolate(context.args);
                        cli.println(str);
                        return 0;
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
                ...FS_COMMANDS
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
            }
        }
        ;
        init() {
            this.println(OSID + '\n');
            document.title = OSID;
            this.core.environment.put(HISTORY_MAX_ENV_VAR, 100);
            this.core.environment.put(PROMPT_ENV_VAR, '$CWD $');
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
