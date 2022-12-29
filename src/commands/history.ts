import { CommandContext, CommandExecutor } from "../command";

export class HistoryExecutor implements CommandExecutor {
    readonly shortDescription: string = 'List previous commands.';

    invoke(context: CommandContext) {
        const cli = context.cli;
        cli.getHistory().forEach((line, i) => cli.println(i, line));
        return 0;
    }
    
}