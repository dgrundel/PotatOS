export enum ChunkType {
    WHITESPACE,
    DELIMITER,
    DOUBLE_QUOTED,
    SINGLE_QUOTED,
    OTHER
}

export class Chunk {
    readonly content: string;
    readonly type: ChunkType;

    constructor(content: string, type: ChunkType = ChunkType.OTHER) {
        this.content = content;
        this.type = type;
    }
}

export class Chunker {
    private readonly chunks: Chunk[] = [];
    private readonly delimiters: Record<string, boolean>;

    buffer: string = '';
    inEscape: boolean = false;
    inDoubleQuote: boolean = false;
    inWhitespace: boolean = false;

    constructor(delimiters: string = '') {
        this.delimiters = delimiters.split('').reduce((acc: Record<string, boolean>, item: string) => {
            acc[item] = true;
            return acc;
        }, {});
    }

    append(s: string): void {
        const len = s.length;
        let i: number;

        for (i = 0; i < len; i++) {
            this.appendChar(s.charAt(i));
        }
    }

    flush(): Chunk[] {
        this.flushChunk();
        return this.chunks.splice(0);
    }

    private reset(): void {
        this.buffer = '';
        this.inDoubleQuote = false;
        this.inEscape = false;
        this.inWhitespace = false;
    }

    private flushChunk(): void {
        if (this.buffer.length > 0) {
            let type: ChunkType = ChunkType.OTHER;
            if (this.inWhitespace) {
                type = ChunkType.WHITESPACE;
            }
            if (this.inDoubleQuote) {
                type = ChunkType.DOUBLE_QUOTED;
            }

            this.chunks.push(new Chunk(this.buffer, type));    
        }

        this.reset();
    }

    private appendChar(ch: string): void {
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
            this.chunks.push(new Chunk(ch, ChunkType.DELIMITER));
            return;
        }

        this.buffer += ch;
    }
}