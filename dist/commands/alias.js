import { isKeyValuePair, parseKeyValuePairs } from '../keyValuePairs';
class UserDefinedAlias {
    command;
    constructor(command) {
        this.command = command;
    }
    async invoke(context) {
        const cli = context.cli;
        return cli.invokeCommand(this.command);
    }
}
export class AliasExecutor {
    disallowOverride = true;
    shortDescription = 'List and create aliases for commands';
    async invoke(context) {
        const cli = context.cli;
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
                }
                catch (e) {
                    cli.printerr(e.message);
                }
            });
        }
        else {
            const registered = cli.getRegisteredCommands();
            const aliases = Object.keys(registered)
                .filter(key => registered[key] instanceof UserDefinedAlias);
            if (aliases.length > 0) {
                aliases.forEach(key => {
                    const c = registered[key];
                    cli.println(key + '=' + c.command);
                });
            }
            else {
                cli.println('No aliases defined.');
            }
        }
        return 0;
    }
}
