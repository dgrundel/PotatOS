import { Environment } from "../src/Environment";

describe('Environment', () => {
    let env: Environment;

    beforeEach(() => {
        env = new Environment({
            'USER': 'tester'
        });
    })

    describe('interpolate', () => {
        it('finds values in a string', () => {
            expect(env.interpolate('Hello, $USER! Welcome.'))
                .toBe('Hello, tester! Welcome.');
        });

        it('finds values at beginning', () => {
            expect(env.interpolate('$USER! Welcome.'))
                .toBe('tester! Welcome.');
        });

        it('finds values at end', () => {
            expect(env.interpolate('Hello $USER'))
                .toBe('Hello tester');
        });

        it('finds values when they are alone', () => {
            expect(env.interpolate('$USER'))
                .toBe('tester');
        });
    });
});