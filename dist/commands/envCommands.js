import { isKeyValuePair, parseKeyValuePairs } from "../keyValuePairs";
const ENV_KEY_TEST_PATTERN = /^[A-Za-z0-9_-]+$/;
export const ENV_COMMANDS = {
    env: {
        shortDescription: 'Display environment values',
        invoke: async (context) => {
            const { cli, env } = context;
            env.keys().sort().forEach(key => {
                cli.println(key + '=' + env.getString(key));
            });
            return 0;
        }
    },
    set: {
        shortDescription: 'Set an environment value',
        invoke: async (context) => {
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
};
