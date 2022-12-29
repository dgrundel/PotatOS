import { isKeyValuePair, parseKeyValuePairs } from "../keyValuePairs";
import { CommandContext, CommandExecutor } from "./interface";

export class SetExecutor implements CommandExecutor {
    readonly shortDescription: string = 'Set an environment value.';

    invoke(context: CommandContext) {
        const pairs = parseKeyValuePairs(context.args);
        pairs.forEach(pair => {
            if (isKeyValuePair(pair)) {
                context.cli.setEnvironmentValue(pair.key, pair.value);
            } else {
                context.cli.printerr(pair.message);
            }
        });

        return 0;
    }
    
}