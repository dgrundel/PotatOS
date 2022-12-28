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
    readonly chunks: Chunk[] = [];
    readonly delimiters: Record<string, boolean>;

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

    getChunks(): Chunk[] {
        return this.chunks.slice();
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

        if (ch === '"') {
            // end of double-quoted string
            if (this.inDoubleQuote === true) {
                this.flushChunk();
            }

            // start of quoted string
            if (this.inDoubleQuote === false && this.buffer.length > 0) {
                this.flushChunk();
                this.inDoubleQuote = true;
            }

            return;
        }

        // white space
        if (/\s/.test(ch)) {
            if (this.inDoubleQuote) {
                this.buffer += ch;
                return;
            }

            if (this.inWhitespace) {
                this.buffer += ch;
                return;
            }

            this.flushChunk();
            
            this.inWhitespace = true;
            this.buffer += ch;
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