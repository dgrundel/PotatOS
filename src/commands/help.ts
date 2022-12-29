import { CLI } from "../CLI";
import { CommandExecutor } from "./interface";

export class HelpExecutor implements CommandExecutor {
    readonly shortDescription: string = 'Prints this message.';

    invoke(cli: CLI) {
        const commands = cli.getRegisteredCommands();
        const tab = cli.getEnvironmentValue('TAB');

        cli.println('Available commands:');
        Object.keys(commands).sort()
            .filter(cmd => !!commands[cmd].shortDescription)
            .forEach(cmd => {
                cli.println(tab + cmd + ' - ' + commands[cmd].shortDescription);
            });

        return 0;
    }
    
}