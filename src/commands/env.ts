import { CommandContext, CommandExecutor } from "../command";

export class EnvExecutor implements CommandExecutor {
    readonly shortDescription: string = 'Display environment values';

    async invoke(context: CommandContext) {
        const { cli, env } = context;
        env.keys().sort().forEach(key => {
            cli.println(key + '=' + env.getString(key));
        });
        return 0;
    }
}