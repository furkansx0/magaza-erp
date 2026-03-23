const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
            processDir(fullPath);
        }
        else if (fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('"use server"') || content.includes("'use server'")) {
                content = content.replace(/^export\s+(type|interface)\s+/gm, '$1 ');
                fs.writeFileSync(fullPath, content);
            }
        }
    }
}

try {
    processDir('src/actions');
    console.log('Done removing exports from actions');
} catch (e) {
    console.error(e);
}
