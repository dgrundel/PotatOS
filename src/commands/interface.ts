import { CLI } from "../CLI";

export interface CommandContext {
    cli: CLI;
    command: string;
    args: string;
}

export interface CommandExecutor {
    shortDescription?: string;
    disallowOverride?: boolean;
    invoke(context: CommandContext): number | Error;
}