export var ChunkType;
(function (ChunkType) {
    ChunkType[ChunkType["WHITESPACE"] = 0] = "WHITESPACE";
    ChunkType[ChunkType["DELIMITER"] = 1] = "DELIMITER";
    ChunkType[ChunkType["DOUBLE_QUOTED"] = 2] = "DOUBLE_QUOTED";
    ChunkType[ChunkType["SINGLE_QUOTED"] = 3] = "SINGLE_QUOTED";
    ChunkType[ChunkType["OTHER"] = 4] = "OTHER";
})(ChunkType || (ChunkType = {}));
export class Chunk {
    constructor(content, type = ChunkType.OTHER) {
        this.content = content;
        this.type = type;
    }
    toString() {
        return this.content;
    }
}
export class Chunker {
    constructor(delimiters = '', limit = -1) {
        this.chunks = [];
        this.buffer = '';
        this.inEscape = false;
        this.inDoubleQuote = false;
        this.inWhitespace = false;
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
