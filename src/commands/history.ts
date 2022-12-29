import { CommandContext, CommandExecutor } from "./interface";

export class HistoryExecutor implements CommandExecutor {
    readonly shortDescription: string = 'List previous commands.';

    invoke(context: CommandContext) {
        context.cli.getHistory().forEach((line, i) => {
            context.cli.println(i, line);
        });
        return 0;
    }
    
}