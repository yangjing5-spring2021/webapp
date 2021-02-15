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

const Sequelize = require('sequelize');
const sequelize = new Sequelize(dbConfig.database, dbConfig.user, dbConfig.password, {
    host: dbConfig.host,
    dialect: 'mysql',
    pool: {
        max: 5,
        min: 0,
        idle: 30000
    }
});

module.exports = sequelize;