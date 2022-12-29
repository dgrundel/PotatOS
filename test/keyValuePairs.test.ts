import { parseKeyValuePairs } from "../src/keyValuePairs";

describe('parseKeyValuePairs', () => {
    it('should parse pairs delimited by equals sign', () => {
        const pairs = parseKeyValuePairs('k1=v1 k2=v2 k3=v3');
        expect(pairs).toMatchObject([
            { key: 'k1', value: 'v1' },
            { key: 'k2', value: 'v2' },
            { key: 'k3', value: 'v3' }
        ]);
    });

    it('should handle empty values', () => {
        const pairs = parseKeyValuePairs('k1=v1 k2= k3=v3');
        expect(pairs).toMatchObject([
            { key: 'k1', value: 'v1' },
            { key: 'k2', value: '' },
            { key: 'k3', value: 'v3' }
        ]);
    });

    it('should respect quoted strings', () => {
        const pairs = parseKeyValuePairs('k1=v1 k2="this is neat!" k3=v3');
        expect(pairs).toMatchObject([
            { key: 'k1', value: 'v1' },
            { key: 'k2', value: 'this is neat!' },
            { key: 'k3', value: 'v3' }
        ]);
    });

    it('should return error when not enough chunks available', () => {
        const pairs = parseKeyValuePairs('k1');
        expect(pairs).toMatchObject([
            new Error('Syntax error: Expected "key=value" syntax. Got k1')
        ]);
    });

    it('should return error when bad syntax encountered', () => {
        const pairs = parseKeyValuePairs('k1 v1 k2 v2');
        expect(pairs).toMatchObject([
            new Error('Syntax error: Expected "key=value" syntax. Got v1k2v2')
        ]);
    });
});