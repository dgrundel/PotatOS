export class HelpExecutor {
    shortDescription = 'Prints this message';
    async invoke(context) {
        const { cli, env } = context;
        const commands = cli.getRegisteredCommands();
        const tab = env.getString('TAB');
        cli.println('Available commands:');
        Object.keys(commands).sort()
            .filter(cmd => !!commands[cmd].shortDescription)
            .forEach(cmd => {
            cli.println(tab + cmd + ' - ' + commands[cmd].shortDescription);
        });
        return 0;
    }
}
