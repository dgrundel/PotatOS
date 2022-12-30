import { CLI } from "./CLI";
import { Environment } from "./Environment";
import { PotatoFS } from "./PotatoFS";

export interface CommandContext {
    command: string;
    args: string;
    cli: CLI;
    env: Environment;
    fs: PotatoFS;
}

export interface CommandExecutor {
    shortDescription?: string;
    disallowOverride?: boolean;
    invoke(context: CommandContext): Promise<number | Error>;
}