const fs = require('fs');
const path = require('path');
const types = ['DateRangeType', 'ProductWithVariants', 'TransferItem', 'ProductStockInfo', 'ValidatedProduct'];

function refactorFile(fullPath) {
    let content = fs.readFileSync(fullPath, 'utf8');
    let changed = false;
    let extractedTypes = new Set();

    // Regex to match imports from @/actions/...
    const importRegex = /import\s+\{([^}]+)\}\s+from\s+[\"'](\@\/actions\/[^\"]+)[\"']/g;
    content = content.replace(importRegex, (match, importsStr, modulePath) => {
        let imports = importsStr.split(',').map(s => s.trim()).filter(s => s);
        let newImports = [];
        for (let imp of imports) {
            let typeName = imp.replace(/^type\s+/, '').trim();
            if (types.includes(typeName)) {
                extractedTypes.add(typeName);
                changed = true;
            } else {
                newImports.push(imp);
            }
        }
        if (newImports.length === 0) return '';
        return `import { ${newImports.join(', ')} } from '${modulePath}'`;
    });

    if (extractedTypes.size > 0) {
        // Add import to top
        const typeImport = `import type { ${Array.from(extractedTypes).join(', ')} } from '@/types/actions';\n`;
        content = typeImport + content;
        fs.writeFileSync(fullPath, content);
        console.log('Fixed ' + fullPath);
    }
}

function processDir(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) { processDir(fullPath); }
        else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            refactorFile(fullPath);
        }
    }
}
processDir('src/components');
processDir('src/app');
