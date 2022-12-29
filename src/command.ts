import { CLI } from "./CLI";
import { Environment } from "./Environment";

export interface CommandContext {
    command: string;
    args: string;
    cli: CLI;
    env: Environment;
}

export interface CommandExecutor {
    shortDescription?: string;
    disallowOverride?: boolean;
    invoke(context: CommandContext): number | Error;
}