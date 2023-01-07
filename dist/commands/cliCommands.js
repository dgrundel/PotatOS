export const CLI_COMMANDS = {
    clear: {
        shortDescription: 'Clear the console',
        invoke: async (context) => {
            context.cli.clear();
            return 0;
        }
    },
    echo: {
        shortDescription: 'Say something',
        invoke: async (context) => {
            const { cli, env } = context;
            const str = env.interpolate(context.args);
            cli.println(str);
            return 0;
        }
    },
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
        invoke: async (context) => {
            const { cli, args } = context;
            if (args.trim() === '--clear') {
                cli.clearHistory();
            }
            else {
                cli.getHistory().forEach((line, i) => cli.println(i, line));
            }
            return 0;
        }
    },
    potato: {
        shortDescription: 'Print a cute, little potato',
        invoke: async (context) => {
            context.cli.println('🥔');
            return 0;
        }
    },
    sleep: {
        shortDescription: 'Wait a while',
        invoke: async (context) => new Promise(resolve => {
            const { cli, args } = context;
            const seconds = +(args.trim());
            if (seconds > 0) {
                cli.println(`Sleeping for ${seconds} seconds.`);
                setTimeout(resolve, seconds * 1000);
            }
        })
    }
};
