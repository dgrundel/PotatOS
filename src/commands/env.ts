import { CommandContext, CommandExecutor } from "./interface";

export class EnvExecutor implements CommandExecutor {
    readonly shortDescription: string = 'Display environment values.';

    invoke(context: CommandContext) {
        context.cli.getEnvironmentKeys().sort().forEach(key => {
            context.cli.println(key + '=' + context.cli.getEnvironmentValue(key));
        });
        return 0;
    }
}