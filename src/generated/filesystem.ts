export const FILESYSTEM_ROOT: any = {
    "name": "",
    "children": {
        "apps": {
            "name": "apps",
            "children": {}
        },
        "home": {
            "name": "home",
            "children": {
                "$USER": {
                    "name": "$USER",
                    "children": {}
                }
            }
        },
        "tmp": {
            "name": "tmp",
            "children": {
                "test.txt": {
                    "name": "test.txt",
                    "blob": "data:text/plain;base64,aGVsbG8h"
                }
            }
        }
    }
};