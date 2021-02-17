
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
    //account_created: Sequelize.DATE,
    //account_updated: Sequelize.DATE
    },
    { 
        timestamps: true,
        underscored: true 
    });
User.sync({ force: false });

module.exports = User;