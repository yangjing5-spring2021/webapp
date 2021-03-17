'use strict';

const mysql = require('mysql');
const environment = require('dotenv');
environment.config();
console.log(process.env.db_hostname);

const dbConfig = {
    db_hostname: process.env.db_hostname.substring(0, process.env.db_hostname.length - 5),
    db_username: process.env.db_username,
    db_password: process.env.db_password,
    db_name: "webapp",
    port: 3306
};

const Sequelize = require('sequelize');
const sequelize = new Sequelize(dbConfig.db_name, dbConfig.db_username, dbConfig.db_password, {
    host: dbConfig.db_hostname,
    dialect: 'mysql',
    pool: {
        max: 5,
        min: 0,
        idle: 30000
    }
});

module.exports = sequelize;