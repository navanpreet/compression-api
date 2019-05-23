const redis = require('redis');
const client = redis.createClient();
const {promisify} = require('util');
const setAsync = promisify(client.set).bind(client);
const delAsync = promisify(client.del).bind(client);
const existsAsync = promisify(client.exists).bind(client);
const {Pool} = require('pg');

const redisMq = require('rsmq');
const rsmq = new redisMq({host: "127.0.0.1", port: 6379, ns: "rsmq"});
const pool = new Pool();

module.exports = {
    queue: rsmq,
    setAsync: setAsync,
    delAsync: delAsync,
    existsAsync: existsAsync,
    db: pool
};