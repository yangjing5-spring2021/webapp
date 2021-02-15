'use strict';

const sequelize = require('../dbConfig.js'); // connection variable
const Sequelize = require('sequelize');

const Book = sequelize.define('book', {
    id: {
        type: Sequelize.STRING(64),
        primaryKey: true,
        allowNull: false
    },
    title: {
        type: Sequelize.STRING(64),
        allowNull: false
    },
    author: {
        type: Sequelize.STRING(64),
        allowNull: false
    },
    isbn: {
        type: Sequelize.STRING(64),
        allowNull: false
    },
    published_date: {
        type: Sequelize.DATE,
        allowNull: false
    },
    book_created: Sequelize.DATE,
    user_id: Sequelize.STRING(64)
}, {
        timestamps: false
});
Book.sync({ force: false });

module.exports = Book;