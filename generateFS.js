const fs = require('fs');
const path = require('path');

const serializeFile = (filepath) => {
    // const mime = 'image/png'; 
    const mime = 'text/plain'; 
    const encoding = 'base64'; 
    const data = fs.readFileSync(filepath).toString(encoding); 
    return 'data:' + mime + ';' + encoding + ',' + data; 
};

const walk = (dir, node) => {
    const children = fs.readdirSync(dir, 'utf8');
    children.forEach(name => {
        const childPath = path.join(dir, name);
        const stats = fs.statSync(childPath);
        const child = {
            name
        };

        if (stats.isDirectory()) {
            child.children = {};
            node.children[child.name] = child;
            walk(childPath, child);

        } else if (stats.isFile()) {
            child.blob = serializeFile(childPath);
            node.children[child.name] = child;
        }
    });
};

const rootDir = path.join(__dirname, 'filesystem');
const root = {
    name: '',
    children: {}
};
walk(rootDir, root);

const json = JSON.stringify(root, null, 4);
const ts = `export const FILESYSTEM_ROOT: any = ${json};`;
const outfile = path.join(__dirname, 'src/generated/filesystem.ts');
fs.writeFileSync(outfile, ts, 'utf8');