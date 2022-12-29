import { Chunk, Chunker, ChunkType } from "./Chunker";

const chunker = new Chunker('=');

export interface KeyValuePair {
    key: string;
    value: string;
}

export const isKeyValuePair = (item: any): item is KeyValuePair => {
    return item && typeof item === 'object' && typeof item.key === 'string' && typeof item.value === 'string';
}

export const parseKeyValuePairs = (s: string): (KeyValuePair | Error)[] => {
    chunker.append(s);
    const chunks: Chunk[] = chunker.flush().filter(c => c.type !== ChunkType.WHITESPACE);

    const pairs: (KeyValuePair | Error)[] = [];

    if (chunks.length < 2) {
        return [
            new Error(`Syntax error: Expected "key=value" syntax. Got ${chunks.map(a => a.toString()).join(' ')}`)
        ];
    }

    let i = chunks.length - 1;
    while (i > 0) {
        let key = chunks[i-2].content,
            eq = chunks[i-1].content,
            value = chunks[i].content;

        // for blank values, e.g. "key="
        if (value === '=' && eq !== '=') {
            key = eq;
            eq = value;
            value = '';
            i = i-2;
        } else {
            i = i-3
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
