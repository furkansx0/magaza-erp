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
            if (content.match(/["']use server["']/)) {
                const lines = content.split('\n');
                lines.forEach((line, i) => {
                    const t = line.trim();
                    if (t.startsWith('export ') && !t.includes('function ')) {
                        // EXPORT TYPE was already handled, but just to be sure
                        console.log(`SUSPICIOUS EXPORT in ${fullPath}:${i + 1} -> ${t}`);
                    }
                });
            }
        }
    }
}
processDir('src/actions');
