export class EchoExecutor {
    constructor() {
        this.shortDescription = 'Say something.';
    }
    invoke(context) {
        context.cli.println(context.args);
        return 0;
    }
}
