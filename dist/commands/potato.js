export class PotatoExecutor {
    constructor() {
        this.shortDescription = 'Print a cute, little potato.';
    }
    invoke(context) {
        context.cli.println('🥔');
        return 0;
    }
}
