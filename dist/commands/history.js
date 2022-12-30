export class HistoryExecutor {
    shortDescription = 'List previously used commands';
    async invoke(context) {
        const cli = context.cli;
        cli.getHistory().forEach((line, i) => cli.println(i, line));
        return 0;
    }
}
