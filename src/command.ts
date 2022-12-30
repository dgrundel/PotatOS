import { CLI } from "./CLI";
import { Environment } from "./Environment";
import { PotatoFS } from "./PotatoFS";
import { OSCore } from './OSCore';

export interface CommandContext {
    command: string;
    args: string;
    cli: CLI;
    env: Environment;
    fs: PotatoFS;
    core: OSCore;
}

export interface CommandExecutor {
    shortDescription?: string;
    help?: string;
    disallowOverride?: boolean;
    invoke(context: CommandContext): Promise<number | Error>;
}