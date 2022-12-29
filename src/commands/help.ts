import { CommandContext, CommandExecutor } from "./interface";

export class HelpExecutor implements CommandExecutor {
    readonly shortDescription: string = 'Prints this message.';

    invoke(context: CommandContext) {
        const commands = context.cli.getRegisteredCommands();

        context.cli.println('Available commands:');
        Object.keys(commands).sort()
            .filter(cmd => !!commands[cmd].shortDescription)
            .forEach(cmd => {
                context.cli.println('  ' + cmd + ' - ' + commands[cmd].shortDescription);
            });

        return 0;
    }
    
}