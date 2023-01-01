import { CommandExecutor } from "../command";

export const HISTORY_COMMANDS: Record<string, CommandExecutor> = {
    history: {
        shortDescription: 'List previously used commands',
        help: [
            'Usage:',
            '  history [--clear]',
            '',
            'With no arguments, displays your previously used commands up to $HISTORY_MAX.',
            '',
            'When the --clear argument is supplied, clears your stored history.'
        ].join('\n'),
        invoke: async context => {
            const { cli, args } = context;

            if (args.trim() === '--clear') {
                cli.clearHistory();
            } else {
                cli.getHistory().forEach((line, i) => cli.println(i, line));
            }

            return 0;
        }
    }
};