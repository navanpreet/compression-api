'use strict';

const fs = require('fs').promises;
const RSMQWorker = require( "rsmq-worker" );
const worker = new RSMQWorker( "queue" );
const retryWorker = new RSMQWorker("retry_queue");
const moment = require('moment');
const zlib = require('zlib');
const {promisify} = require('util');
const deflateAsync = promisify(zlib.deflate).bind(zlib);
const {db, delAsync} = require('./db');

let compressAndSave = (body) => {

    // process your message
    // check if we've seen this file before by computing a hash?

    let location = `${__dirname}/files/${body.fileId}.gz`;
    return deflateAsync(new Buffer.from(body.fileBuffer.data))
        .then(compressedBuffer => {
            db.query(`INSERT INTO files (id, name, size, createdAt) VALUES ('${body.fileId}', '${body.name}', '${body.size}', '${moment().utc()}')`)
                .then(res => {
                    return fs.writeFile(location, compressedBuffer)
                })
                .catch(err => {
                    console.log(err)
                });
        })
        .catch(err => {
            // if there is an error deflating, then send it to a queue to try it later
            // TODO: make a consumer for this retry queue

            body.error = err;
            retryWorker.send(JSON.stringify(body))
        })
};


worker.on('error', (err, msg) => {

});
worker.on('message', (msg, next, id) => {

    // delete the message to prevent it from being requeued. Analogous to acking a message in rabbitmq
    worker.del(id);

    let body = JSON.parse(msg);
    compressAndSave(body)
        .then(() => {
            delAsync(`pending:${body.fileId}`)
                .then(() => {

                })
        })
});
worker.start();
retryWorker.start();

module.exports = {
    compressAndSave: compressAndSave
};

