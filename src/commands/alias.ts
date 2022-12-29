import { CommandContext, CommandExecutor } from "./interface";
import { isKeyValuePair, parseKeyValuePairs } from '../keyValuePairs';

class UserDefinedAlias implements CommandExecutor {
    readonly command: string;

    constructor(command: string) {
        this.command = command;
    }

    invoke(context: CommandContext) {
        return context.cli.invokeCommand(this.command);
    }
}

export class AliasExecutor implements CommandExecutor {
    readonly disallowOverride = true;
    readonly shortDescription: string = 'List and create aliases for commands.';

    invoke(context: CommandContext) {
        const args = context.args.trim();
        
        if (args.length > 0) {
            const pairs = parseKeyValuePairs(context.args);
            pairs.forEach(item => {
                if (isKeyValuePair(item)) {
                    try {
                        context.cli.registerCommand(item.key, new UserDefinedAlias(item.value));
                    } catch (e: any) {
                        context.cli.printerr(e.message);
                    }
                    
                } else {
                    context.cli.printerr(item.message);
                }
            });

        } else {
            const registered = context.cli.getRegisteredCommands();
            Object.keys(registered).forEach(key => {
                const c = registered[key];
                if (c instanceof UserDefinedAlias) {
                    context.cli.println(key + '=' + c.command);
                }
            });
        }

        return 0;
    }
}