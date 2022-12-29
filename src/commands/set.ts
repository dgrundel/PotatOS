import { isKeyValuePair, parseKeyValuePairs } from "../keyValuePairs";
import { CommandContext, CommandExecutor } from "./interface";

const ENV_KEY_TEST_PATTERN = /^[A-Za-z0-9_-]+$/;

export class SetExecutor implements CommandExecutor {
    readonly shortDescription: string = 'Set an environment value.';

    invoke(context: CommandContext) {
        const pairs = parseKeyValuePairs(context.args);
        pairs.forEach(pair => {
            if (isKeyValuePair(pair)) {

                if (ENV_KEY_TEST_PATTERN.test(pair.key)) {
                    context.cli.setEnvironmentValue(pair.key, pair.value);
                } else {
                    context.cli.printerr(`Error: ${pair.key} must match pattern ${ENV_KEY_TEST_PATTERN.toString()}`);
                }

            } else {
                context.cli.printerr(pair.message);
            }
        });

        return 0;
    }
    
}