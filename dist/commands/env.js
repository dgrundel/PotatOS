export class EnvExecutor {
    constructor() {
        this.shortDescription = 'Display environment values';
    }
    invoke(context) {
        const { cli, env } = context;
        env.keys().sort().forEach(key => {
            cli.println(key + '=' + env.getString(key));
        });
        return 0;
    }
}
