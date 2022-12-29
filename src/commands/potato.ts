import { CommandContext, CommandExecutor } from "./interface";

export class PotatoExecutor implements CommandExecutor {
    readonly shortDescription: string = 'Print a cute, little potato.';

    invoke(context: CommandContext) {
        context.cli.println('🥔');
        return 0;
    }
}