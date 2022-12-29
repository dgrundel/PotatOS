import { CommandContext, CommandExecutor } from "./interface";
import { isKeyValuePair, parseKeyValuePairs } from '../keyValuePairs';
import { CLI } from "../CLI";

class UserDefinedAlias implements CommandExecutor {
    readonly command: string;

    constructor(command: string) {
        this.command = command;
    }

    invoke(cli: CLI) {
        return cli.invokeCommand(this.command);
    }
}

export class AliasExecutor implements CommandExecutor {
    readonly disallowOverride = true;
    readonly shortDescription: string = 'List and create aliases for commands.';

    invoke(cli: CLI, context: CommandContext) {
        const args = context.args.trim();
        
        if (args.length > 0) {
            const pairs = parseKeyValuePairs(context.args);
            pairs.forEach(item => {
                if (!isKeyValuePair(item)) {
                    cli.printerr(item.message);
                    return;
                }

                if (!item.value) {
                    cli.printerr(`Error: Alias ${item.key} cannot be empty. Maybe try using double quotes.`);
                    return;
                }
                
                try {
                    cli.registerCommand(item.key, new UserDefinedAlias(item.value));
                } catch (e: any) {
                    cli.printerr(e.message);
                }
            });

        } else {
            const registered = cli.getRegisteredCommands();
            const aliases = Object.keys(registered)
                .filter(key => registered[key] instanceof UserDefinedAlias);
            
            if (aliases.length > 0) {
                aliases.forEach(key => {
                    const c = registered[key] as UserDefinedAlias;
                    cli.println(key + '=' + c.command);
                });
            } else {
                cli.println('No aliases defined.');
            }

            
        }

        return 0;
    }
}