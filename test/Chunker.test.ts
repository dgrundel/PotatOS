import { Chunk, Chunker, ChunkType } from "../src";

describe('Chunker', () => {
    it('should chunk whitespace', () => {
        const chunker = new Chunker();
        chunker.append('hello, world!');

        expect(chunker.flush()).toMatchObject([
            new Chunk('hello,'),
            new Chunk(' ', ChunkType.WHITESPACE),
            new Chunk('world!')
        ]);
    });

    it('should chunk leading and trailing whitespace', () => {
        const chunker = new Chunker();
        chunker.append(' hello, world! ');

        expect(chunker.flush()).toMatchObject([
            new Chunk(' ', ChunkType.WHITESPACE),
            new Chunk('hello,'),
            new Chunk(' ', ChunkType.WHITESPACE),
            new Chunk('world!'),
            new Chunk(' ', ChunkType.WHITESPACE)
        ]);
    });

    it('should chunk contiguous whitespace', () => {
        const chunker = new Chunker();
        chunker.append('hello,  \t\n  world!');

        expect(chunker.flush()).toMatchObject([
            new Chunk('hello,'),
            new Chunk('  \t\n  ', ChunkType.WHITESPACE),
            new Chunk('world!')
        ]);
    });

    it('should chunk with provided delimiters', () => {
        const chunker = new Chunker('=|');
        chunker.append('set foo=bar|baz qux|34');

        expect(chunker.flush()).toMatchObject([
            new Chunk('set'),
            new Chunk(' ', ChunkType.WHITESPACE),
            new Chunk('foo'),
            new Chunk('=', ChunkType.DELIMITER),
            new Chunk('bar'),
            new Chunk('|', ChunkType.DELIMITER),
            new Chunk('baz'),
            new Chunk(' ', ChunkType.WHITESPACE),
            new Chunk('qux'),
            new Chunk('|', ChunkType.DELIMITER),
            new Chunk('34')
        ]);
    });

    it('should be reusable', () => {
        const chunker = new Chunker();
        chunker.append('hello world');

        expect(chunker.flush()).toMatchObject([
            new Chunk('hello'),
            new Chunk(' ', ChunkType.WHITESPACE),
            new Chunk('world')
        ]);

        chunker.append('another set of chunks');

        expect(chunker.flush()).toMatchObject([
            new Chunk('another'),
            new Chunk(' ', ChunkType.WHITESPACE),
            new Chunk('set'),
            new Chunk(' ', ChunkType.WHITESPACE),
            new Chunk('of'),
            new Chunk(' ', ChunkType.WHITESPACE),
            new Chunk('chunks')
        ]);
    });
});