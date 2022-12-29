import { CLI } from "../CLI";

export interface CommandContext {
    command: string;
    args: string;
}

export interface CommandExecutor {
    shortDescription?: string;
    disallowOverride?: boolean;
    invoke(cli: CLI, context: CommandContext): number | Error;
}