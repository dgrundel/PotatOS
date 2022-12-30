export class HistoryExecutor {
    constructor() {
        this.shortDescription = 'List previously used commands';
    }
    invoke(context) {
        const cli = context.cli;
        cli.getHistory().forEach((line, i) => cli.println(i, line));
        return 0;
    }
}
