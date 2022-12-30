import { isKeyValuePair, parseKeyValuePairs } from "../keyValuePairs";
const ENV_KEY_TEST_PATTERN = /^[A-Za-z0-9_-]+$/;
export class SetExecutor {
    constructor() {
        this.shortDescription = 'Set an environment value';
    }
    invoke(context) {
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
