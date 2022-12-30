export class EnvExecutor {
    shortDescription = 'Display environment values';
    async invoke(context) {
        const { cli, env } = context;
        env.keys().sort().forEach(key => {
            cli.println(key + '=' + env.getString(key));
        });
        return 0;
    }
}
