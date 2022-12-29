import { Chunk, Chunker, ChunkType } from "../src/Chunker";

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

    it('should respect double quoted strings', () => {
        const chunker = new Chunker();
        chunker.append('hello, my name is "Inigo Montoya".');

        expect(chunker.flush()).toMatchObject([
            new Chunk('hello,'),
            new Chunk(' ', ChunkType.WHITESPACE),
            new Chunk('my'),
            new Chunk(' ', ChunkType.WHITESPACE),
            new Chunk('name'),
            new Chunk(' ', ChunkType.WHITESPACE),
            new Chunk('is'),
            new Chunk(' ', ChunkType.WHITESPACE),
            new Chunk('Inigo Montoya', ChunkType.DOUBLE_QUOTED),
            new Chunk('.')
        ]);
    });

    it('should handle adjacent delimiters', () => {
        const chunker = new Chunker('=');
        chunker.append('k1=v1 k2="this is neat!" k3=v3');
        expect(chunker.flush()).toMatchObject([
            new Chunk('k1'),
            new Chunk('=', ChunkType.DELIMITER),
            new Chunk('v1'),
            new Chunk(' ', ChunkType.WHITESPACE),
            new Chunk('k2'),
            new Chunk('=', ChunkType.DELIMITER),
            new Chunk('this is neat!', ChunkType.DOUBLE_QUOTED),
            new Chunk(' ', ChunkType.WHITESPACE),
            new Chunk('k3'),
            new Chunk('=', ChunkType.DELIMITER),
            new Chunk('v3')
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