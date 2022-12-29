import { CLI } from "../CLI";
import { isKeyValuePair, parseKeyValuePairs } from "../keyValuePairs";
import { CommandContext, CommandExecutor } from "./interface";

const ENV_KEY_TEST_PATTERN = /^[A-Za-z0-9_-]+$/;

export class SetExecutor implements CommandExecutor {
    readonly shortDescription: string = 'Set an environment value.';

    invoke(cli: CLI, context: CommandContext) {
        const pairs = parseKeyValuePairs(context.args);
        pairs.forEach(pair => {
            if (isKeyValuePair(pair)) {

                if (ENV_KEY_TEST_PATTERN.test(pair.key)) {
                    cli.setEnvironmentValue(pair.key, pair.value);
                } else {
                    cli.printerr(`Error: ${pair.key} must match pattern ${ENV_KEY_TEST_PATTERN.toString()}`);
                }

            } else {
                cli.printerr(pair.message);
            }
        });

        return 0;
    }
    
}