export const FILESYSTEM_ROOT = {
    name: '',
    children: {
        'home': {
            name: 'home',
            children: {
                '$USER': {
                    name: '$USER',
                    children: {}
                }
            }
        },
        'apps': {
            name: 'apps',
            children: {}
        },
        'tmp': {
            name: 'tmp',
            children: {}
        }
    }
};
