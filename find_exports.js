const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.ts')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.match(/["']use server["']/) && content.match(/export\s+(type|interface)/)) {
                console.log('Found exports in: ' + fullPath);
            }
        }
    }
}
processDir('src/actions');
