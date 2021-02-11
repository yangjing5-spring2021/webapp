'use strict';

const mysql = require('mysql');
const environment = require('dotenv');
environment.config();

const dbConfig = {
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    database: 'webapp',
    port: 3306
};

module.exports = dbConfig;