const fs = require('fs');
const zlib = require('zlib');

let str = 'this is a test string';

zlib.deflate(new Buffer.from(str), (err, compressedBuffer) => {
    let name = 'try.txt.zip';
    console.log(compressedBuffer)
    zlib.inflate(compressedBuffer, (err, buf) => {
        console.log(buf.toString())
    })
    fs.writeFile(name, compressedBuffer, () => {console.log('done')});
});

