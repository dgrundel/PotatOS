export var ChunkType;
(function (ChunkType) {
    ChunkType["WHITESPACE"] = "WHITESPACE";
    ChunkType["DELIMITER"] = "DELIMITER";
    ChunkType["DOUBLE_QUOTED"] = "DOUBLE_QUOTED";
    ChunkType["SINGLE_QUOTED"] = "SINGLE_QUOTED";
    ChunkType["OTHER"] = "OTHER";
})(ChunkType || (ChunkType = {}));
export class Chunk {
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
export class Chunker {
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
