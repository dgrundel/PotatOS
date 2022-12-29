import { CLI } from "../CLI";

export interface CommandContext {
    cli: CLI;
    command: string;
    args: string;
}

export interface CommandExecutor {
    shortDescription: string;

    invoke: (context: CommandContext) => number;
}