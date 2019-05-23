const {expect} = require('chai');
const {describe} = require('mocha');
const {compressAndSave} = require('./worker');
const uuid = require('uuid/v4');
const {queue, db, setAsync} = require('./db');
const fs = require('fs');
const zlib = require('zlib');
const {promisify} = require('util');
const inflateAsync = promisify(zlib.inflate).bind(zlib);

describe('compress and save', () => {
   let testString = "Simple string text";
   let id = uuid();
   let msg = {
      fileBuffer: new Buffer.from(testString),
      fileId: id,
      name: 'test.txt',
      size: testString.length
   };
   let location = `${__dirname}/files/${msg.fileId}.gz`;
   it('creates a simple file, compresses it and saves it', () => {
      compressAndSave(msg)
          .then(() => {
             // check if file exists at that path
             expect(fs.existsSync(location)).to.be.true;
          })
   });
   it('checks if the file content is correct', () => {
      let content = fs.inflateSync(location).toString();
      expect(content).to.be.equal(testString);

   });

   fs.unlinkSync(`${__dirname}/files/${msg.fileId}.gz`)
});

