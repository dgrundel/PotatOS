import { CommandContext, CommandExecutor } from "../command";
import { isKeyValuePair, parseKeyValuePairs } from '../keyValuePairs';

class UserDefinedAlias implements CommandExecutor {
    readonly command: string;

    constructor(command: string) {
        this.command = command;
    }

    async invoke(context: CommandContext) {
        const { cli, core, args } = context;
        const invocation = `${this.command} ${args}`;
        return core.invokeCommand(invocation, cli);
    }
}

export const ALIAS_EXECUTOR: CommandExecutor = {
    disallowOverride: true,
    shortDescription: 'List and create aliases for commands',
    invoke: async (context: CommandContext) => {
        const { cli, core } = context;
        const args = context.args.trim();
        
        if (args.length > 0) {
            const pairs = parseKeyValuePairs(args);
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
                    core.registerCommand(item.key, new UserDefinedAlias(item.value));
                } catch (e: any) {
                    cli.printerr(e.message);
                }
            });

        } else {
            const registered = core.getRegisteredCommands();
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