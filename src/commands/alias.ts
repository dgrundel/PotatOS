import { CommandContext, CommandExecutor } from "./interface";
import { isKeyValuePair, parseKeyValuePairs } from '../keyValuePairs';

export class AliasExecutor implements CommandExecutor {
    readonly shortDescription: string = 'List and create aliases for commands.';
    private readonly aliases: Record<string, string> = {};

    invoke(context: CommandContext) {
        const args = context.args.trim();
        
        if (args.length > 0) {
            const pairs = parseKeyValuePairs(context.args);
            pairs.forEach(item => {
                if (isKeyValuePair(item)) {
                    this.aliases[item.key] = item.value;
                } else {
                    context.cli.printerr(item.message);
                }
            });

        } else {
            Object.keys(this.aliases).sort().forEach(key => {
                context.cli.println(key + '=' + this.aliases[key]);
            });
        }

        return 0;
    }
}