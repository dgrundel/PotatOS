
type EnvironmentMap = { [key: string]: string };

const ENV_REPLACE_PATTERN = /\$([a-zA-Z0-9_-]+)/g;

export class Environment {
    private readonly env: EnvironmentMap;

    constructor(initial: EnvironmentMap = {}) {
        this.env = initial;
    }

    keys(): string[] {
        return Object.keys(this.env);
    }

    getString(key: string): string {
        return this.env[key] || '';
    }

    getNumber(key: string): number {
        return (+this.env[key]) || 0;
    }

    put(key: string, value: any): void {
        if (!key) {
            throw new Error('Error: Cannot put empty key in environment.');
        }
        this.env[key] = this.stringify(value);
    }

    interpolate(s: string): string {
        return s.replace(ENV_REPLACE_PATTERN, (raw: string, key: string) => {
            return (this.env.hasOwnProperty(key) ? this.env[key] : raw);
        });
    }

    private stringify(value: any): string {
        const type = typeof value;
        if (type === 'string') {
            return value;
        }
        if (type === 'boolean' || type === 'number') {
            return value.toString();
        }
        if (value) {
            return JSON.stringify(value);
        }
        return '';
    }
}