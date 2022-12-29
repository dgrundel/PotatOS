import { CLI } from "../CLI";
import { CommandExecutor } from "./interface";

export class HistoryExecutor implements CommandExecutor {
    readonly shortDescription: string = 'List previous commands.';

    invoke(cli: CLI) {
        cli.getHistory().forEach((line, i) => cli.println(i, line));
        return 0;
    }
    
}