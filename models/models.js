
const sequelize = require('../dbConfig.js'); // connection variable
const Sequelize = require('sequelize');

const User = sequelize.define('user', {
        id: {
                type: Sequelize.STRING(64),
                primaryKey: true
            },
            first_name: {
                type: Sequelize.STRING(64),
                allowNull: false
            },
            last_name:  {
                type: Sequelize.STRING(64),
                allowNull: false
            },
            password:  {
                type: Sequelize.STRING(64),
                allowNull: false
            },
            username:  {
                type: Sequelize.STRING(64),
                allowNull: false
            },
    },
    { 
        timestamps: true,
        underscored: true 
    });
    User.sync({ force: false });

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
    },
    { 
        timestamps: false,
        underscored: true 
    });
Book.sync({ force: false });


module.exports = {
    User,
    Book
};