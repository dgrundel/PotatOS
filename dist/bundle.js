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
            const cli = context.cli;
            return cli.invokeCommand(this.command);
        }
    }
    class AliasExecutor {
        disallowOverride = true;
        shortDescription = 'List and create aliases for commands';
        async invoke(context) {
            const cli = context.cli;
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
                        cli.registerCommand(item.key, new UserDefinedAlias(item.value));
                    }
                    catch (e) {
                        cli.printerr(e.message);
                    }
                });
            }
            else {
                const registered = cli.getRegisteredCommands();
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
        async invoke(context) {
            const { cli, env } = context;
            const commands = cli.getRegisteredCommands();
            const tab = env.getString('TAB');
            cli.println('Available commands:');
            Object.keys(commands).sort()
                .filter(cmd => !!commands[cmd].shortDescription)
                .forEach(cmd => {
                cli.println(tab + cmd + ' - ' + commands[cmd].shortDescription);
            });
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
            // TODO: validate
            const resolved = this.resolve(path);
            this.environment.put(CWD_ENV_VAR, resolved);
        }
        cwd() {
            // TODO: ensure never blank
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
                    throw new Error(`Unexpected non-parent node "${node.name}"`);
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
                    throw new Error(`Unexpected non-parent node "${node.name}"`);
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
            invoke: async (context) => {
                const { args, fs, cli } = context;
                const node = fs.get(args.trim());
                if (PotatoFS.isFile(node)) {
                    const reader = new FileReader();
                    reader.onload = e => {
                        cli.println(e.target.result);
                    };
                    reader.readAsText(node.blob);
                    return 0;
                }
                cli.printerr(`${node.name} is not a file.`);
                return 1;
            }
        },
        download: {
            shortDescription: 'Download a file to your computer',
            invoke: async (context) => {
                const { args, fs, cli } = context;
                const node = fs.get(args.trim());
                if (PotatoFS.isFile(node)) {
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
                cli.printerr(`${node.name} is not a file.`);
                return 1;
            }
        },
        cd: {
            shortDescription: 'Change current working directory',
            invoke: async (context) => {
                const { args, fs } = context;
                fs.cd(args.trim());
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
        ls: {
            shortDescription: 'List files and folders',
            invoke: async (context) => {
                const { cli, args, fs, env } = context;
                const nodes = fs.list(args.trim());
                const tab = env.getString('TAB');
                cli.println(`cwd: ${fs.cwd()}`);
                nodes.forEach(node => {
                    cli.println(tab + node.name);
                });
                return 0;
            }
        },
        mkdirp: {
            shortDescription: 'Create directories',
            invoke: async (context) => {
                const { args, fs } = context;
                fs.mkdirp(args.trim());
                return 0;
            }
        },
        upload: {
            shortDescription: 'Upload a file to the current directory',
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

    const osid = '🥔 PotatOS 0.1b';
    const commandChunker = new Chunker('', 1);
    const PROMPT_ENV_VAR = 'PROMPT';
    class CLI {
        input;
        output;
        environment;
        commands;
        fs;
        history = [];
        constructor(input, output) {
            this.input = input;
            this.output = output;
            this.environment = new Environment({
                [PROMPT_ENV_VAR]: '$',
                [CWD_ENV_VAR]: '/',
                HISTORY_MAX: '100',
                USER: 'spud',
                TAB: '  '
            });
            this.commands = {
                alias: new AliasExecutor(),
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
                ...FS_COMMANDS
            };
            this.fs = new PotatoFS({ name: '', children: [] }, this.environment);
            this.init();
        }
        getHistory() {
            return this.history.slice();
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
        clear() {
            this.output.innerHTML = '';
        }
        println(...args) {
            const el = document.createElement('div');
            el.textContent = args.map(a => a.toString ? a.toString() : a).join(' ');
            this.output.appendChild(el);
            // this is a hack. There should be a better way to handle this.
            return el;
        }
        printerr(...args) {
            const el = this.println.apply(this, args);
            el.classList.add('stderr');
        }
        async invokeCommand(line) {
            const cmd = commandChunker.append(line).flush()[0].content;
            // run command
            if (this.commands.hasOwnProperty(cmd)) {
                const executor = this.commands[cmd];
                const args = line.substring(cmd.length).trim();
                try {
                    return executor.invoke({
                        command: cmd,
                        args,
                        cli: this,
                        env: this.environment,
                        fs: this.fs
                    });
                }
                catch (e) {
                    return e;
                }
            }
            return new Error(`Unknown command "${cmd}"\nType "help" if you need some.`);
        }
        tick() {
            this.input.parentNode.dataset.prompt = this.environment.getString(PROMPT_ENV_VAR);
            const frame = this.output.parentNode;
            frame.scrollTop = frame.scrollHeight;
        }
        ;
        async invokeInput() {
            const line = (this.input.textContent || '').trim();
            this.input.textContent = '';
            // print entered line to output
            const el = this.println(line);
            el.dataset.prompt = this.environment.getString(PROMPT_ENV_VAR);
            // if there's something to do, do it
            if (line) {
                const result = await this.invokeCommand(line);
                if (result instanceof Error) {
                    this.printerr(result.message);
                }
                // add history entry
                this.history.push(line);
                const historyMax = this.environment.getNumber('HISTORY_MAX');
                if (historyMax >= 0 && this.history.length > historyMax) {
                    this.history = this.history.slice(this.history.length - historyMax);
                }
            }
        }
        ;
        init() {
            let historyCursor = 0;
            this.println(osid + '\n\n');
            document.title = osid;
            this.input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    // TODO await this
                    this.invokeInput();
                    historyCursor = 0;
                }
                else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    historyCursor = (historyCursor === 0 ? this.history.length : historyCursor) - 1;
                    this.input.textContent = this.history[historyCursor];
                    this.input.focus();
                }
                else if (e.key === 'ArrowDown') {
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

    exports.CLI = CLI;
    exports.PROMPT_ENV_VAR = PROMPT_ENV_VAR;

}));
