export const FILESYSTEM_ROOT: any = {
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