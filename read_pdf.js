const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('E:\\coding\\F-虚拟机自定义操作系统-PRD - 虚拟化 - Confluence.pdf');

pdf(dataBuffer).then(function (data) {
    fs.writeFileSync('E:\\coding\\prd_content.txt', data.text);
    console.log('Done reading PDF');
}).catch(function (error) {
    console.error('Error:', error);
});
