"use strict";

const fs = require('fs');

function removeRedundantSection(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Pattern to match the details block with the specific title/content structure
    const pattern = /<details[\s\S]*?summary[\s\S]*?gateway\.profile\.addTitle[\s\S]*?<\/details>/g;
    
    if (pattern.test(content)) {
        const newContent = content.replace(pattern, '<!-- Redundant section removed -->');
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log('Successfully removed redundant section.');
    } else {
        console.log('Section not found.');
    }
}

removeRedundantSection('D:/ni-oh/workspace/deskrpg/src/components/hermes/HermesProfileList.tsx');
