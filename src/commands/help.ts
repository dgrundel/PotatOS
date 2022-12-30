import { CommandContext, CommandExecutor } from "../command";

export class HelpExecutor implements CommandExecutor {
    readonly shortDescription: string = 'Prints this message';
    readonly help: string = new Array(1024).fill('help').join(' ');

    async invoke(context: CommandContext) {
        const { core, cli, env, args } = context;
        const commands = core.getRegisteredCommands();
        const tab = env.getString('TAB');

        const arg = args.trim();

        if (arg) {
            if (commands[arg]) {
                if (commands[arg].help) {
                    cli.println(commands[arg].help);
                } else {
                    cli.printerr(`Command "${arg}" has not provided additional help info.`);
                }

            } else {
                cli.printerr(`Unknown command "${arg}".`);
            }

        } else { // no specific command requested

            cli.println('Use "help [command]" to get more info on a specific command.\n');
            cli.println('Available commands:\n');
            Object.keys(commands).sort()
                .filter(cmd => !!commands[cmd].shortDescription)
                .forEach(cmd => {
                    cli.println(tab + cmd + ' - ' + commands[cmd].shortDescription);
                });
        }

        return 0;
    }
    
}