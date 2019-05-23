'use strict';

const cluster = require('cluster');
const os = require('os');
const express = require('express');
const multer = require('multer');
const upload = multer({storage: multer.memoryStorage()});
const _ = require('lodash');
const uuid = require('uuid/v4');
const compression = require('compression');

const {queue, db, setAsync, existsAsync} = require('./db');

if (!cluster.isMaster) {
    const app = express();
    app.use(compression());
    app.post('/upload', upload.any(), (req, res, next) => {

        // obvious limitation of loading everything in memory and then sending it all at once
        // TODO: receive the file in chunks and send it in chunks

        let response = [];
        let promises = [];

        _.forEach(req.files, (file) => {

            let fileId = uuid();
            let name = file.originalname;
            let buffer = file.buffer;
            let size = file.size;

            let message = {
                fileId: fileId,
                name: name,
                fileBuffer: buffer,
                size: size
            };

            response.push({name: name, id: fileId});
            promises.push(queue.sendMessageAsync({qname: 'queue', message: JSON.stringify(message)})
                .catch(err => {
                    if (err === 'messageTooLong') {
                        res.sendStatus(400);
                        return;
                    }
                    res.sendStatus(500);
                })
            );
            promises.push(setAsync(`pending:${fileId}`, '')
                .catch(err => {

                })
            );
        });
        Promise.all(promises)
            .then(resp => {
                console.log(resp);
                res.send(response);
            })
            .catch(err => {
                console.log(err)
            });
    });
    
    app.get('/file/:fileId', (req, res, next) => {
        // check if file in pending
        // retrieve the file if done

        let fileId = req.params.fileId;

        existsAsync(`pending:${fileId}`)
            .then(exists => {
                if (exists === 1) {
                    res.sendStatus(400);
                    return;
                }
                db.query(`SELECT * from files WHERE id = $1`, [fileId])
                    .then(row => {
                        if (row.rows.length === 0) {
                           res.sendStatus(404);
                           return;
                        }
                        let fileLocation = row.rows[0].id + '.gz';
                        let name = row.rows[0].name;
                        res.download(`/${__dirname}/files/${fileLocation}`, name, err => {
                            if (err) {
                                next(err);
                            } else {
                                console.log('Sent:', fileLocation);
                            }
                        });
                    });
            });
    });

    app.get('/files', (req, res, next) => {
        let itemsPerPage = req.query.size || 20;
        let page = req.query.page || 1;

        db.query(`SELECT name, size, id, createdAt FROM files LIMIT ${itemsPerPage} OFFSET ${(page - 1) * itemsPerPage}`)
            .then(row => {
                let response = [];
                _.forEach(row.rows, values => {
                    response.push(values)
                });
                res.send(response);
            })
            .catch(err => {
                console.log(err);
                res.sendStatus(500);
            });
    });

    app.set('port', process.env.PORT || 3000);

    const server = app.listen(app.get('port'), () => {
        console.log('Express server listening on port ' + server.address().port);
    });
} else {
    const cpuCount = os.cpus().length;
    for (let i = 0; i < cpuCount; i++) {
        cluster.fork();
    }

    queue.createQueueAsync({qname: "compression"})
        .then(resp => {
            if (resp === 1) {
                console.log("queue created")
            }
        })
        .catch(err => console.log("whatevs"))
}