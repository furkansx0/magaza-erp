const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) { processDir(fullPath); }
        else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            // Check if we injected import type at the very beginning BEFORE use client
            const match = content.match(/^(import type \{[^}]+\} from '@\/types\/actions';\s*)/);
            if (match) {
                const injected = match[1];
                const rest = content.slice(injected.length);

                const useClientMatch = rest.match(/^(\uFEFF?["']use client["'];?\s*)/);
                if (useClientMatch) {
                    const useClientStr = useClientMatch[1];
                    const finalRest = rest.slice(useClientStr.length);

                    // Put "use client" first
                    const fixedContent = useClientStr.replace(/^\uFEFF/, '') + injected + finalRest;
                    fs.writeFileSync(fullPath, fixedContent);
                    console.log('Fixed use client order in ' + fullPath);
                }
            }
        }
    }
}
processDir('src/components');
processDir('src/app');
