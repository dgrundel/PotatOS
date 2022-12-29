import { CLI } from "../CLI";
import { CommandExecutor } from "./interface";

export class EnvExecutor implements CommandExecutor {
    readonly shortDescription: string = 'Display environment values.';

    invoke(cli: CLI) {
        cli.getEnvironmentKeys().sort().forEach(key => {
            cli.println(key + '=' + cli.getEnvironmentValue(key));
        });
        return 0;
    }
}