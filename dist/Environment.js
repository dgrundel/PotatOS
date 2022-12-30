const ENV_REPLACE_PATTERN = /\$([a-zA-Z0-9_-]+)/g;
export class Environment {
    constructor(initial = {}) {
        this.env = initial;
    }
    keys() {
        return Object.keys(this.env);
    }
    getString(key) {
        return this.env[key] || '';
    }
    getNumber(key) {
        return (+this.env[key]) || 0;
    }
    put(key, value) {
        if (!key) {
            throw new Error('Error: Cannot put empty key in environment.');
        }
        this.env[key] = this.stringify(value);
    }
    interpolate(s) {
        return s.replace(ENV_REPLACE_PATTERN, (raw, key) => {
            return (this.env.hasOwnProperty(key) ? this.env[key] : raw);
        });
    }
    stringify(value) {
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
