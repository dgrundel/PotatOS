import { CommandContext, CommandExecutor } from "./interface";

export class EchoExecutor implements CommandExecutor {
    readonly shortDescription: string = 'Say something.';
    
    invoke(context: CommandContext) {
        context.cli.println(context.args);
        return 0;
    }
}