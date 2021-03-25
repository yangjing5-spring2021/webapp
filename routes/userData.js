'use strict';
const models = require('../models/models');
const StatsD = require('node-statsd'),
client = new StatsD();
const bcrypt = require('bcrypt');
const saltRounds = 10;

async function createUser(newUser) {
    let errors;
    // To check if provide all the required info
    errors = checkCreateReq(newUser);
    if (errors) {
        return Promise.reject(errors);
    }
    // Check if the username already exists
    await ifUsernameExist(newUser.username).then((ifExisit) => {
        if (ifExisit) {
            errors = "The username already exists";
            return Promise.reject(errors);
        } 
    });

    errors = validateNewUser(newUser);
    if (errors) {
        return Promise.reject(errors);
    }

    const addUser = await bcryptStore(newUser);
    delete addUser.password;
    return Promise.resolve(addUser);
}

function checkCreateReq(newUser) {
    let errors;
    if (!newUser.hasOwnProperty("first_name") ||
    !newUser.hasOwnProperty("last_name") ||
    !newUser.hasOwnProperty("password") ||
    !newUser.hasOwnProperty("username")) {
        errors = "You didn't provide all the required information for a user";
    }
    return errors;
}

async function bcryptStore(newUser) {
    let addUser;
    await bcrypt.hash(newUser.password, saltRounds)
        .then(async (hash) => {
            // Store hash and user data in database.
            newUser.password = hash;
            addUser = await storeUser(newUser);
        })
    return addUser;
}

async function storeUser(newUser) {
    const { v4: uuidv4 } = require('uuid');
    const uid = uuidv4();
    const start = Date.now();
    const addUser = await models.User.create({
        id: uid,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        password: newUser.password,
        username: newUser.username,
        account_created: new Date(),
        account_updated: new Date()
    }).then((data) => {
        client.timing('add_user_DB', Date.now() - start);
        if (data) {
            return data.get({ plain: true });
        }
        return data;
    });   
    return addUser; 
}

function validateNewUser(newUser) {
    let errors;

    // Check if username is an email address
    const emailRegular = /\S+@\S+\.\S+/;
    if (!emailRegular.test(newUser.username)) {
        errors = "Username should be an email address";   
        return errors; 
    } 
    errors = checkPassword(newUser.password);
    return errors;
}

function checkPassword(password) {
    let errors;
     // Check password
     if (password.length <= 8) {
         errors = "Password length must be longer than 8 letters";
         return errors; 
     }
     const passwordRegular = /^[0-9a-zA-Z!?#$_-]{8,}$/;
     const numberRegular = /[0-9]+/;
     const lowercaseRegular = /[a-z]+/;
     const uppercaseRegular = /[A-Z]+/;
     const specialRegular = /[!?#$_-]+/;
     if (!passwordRegular.test(password)) {
         errors = "Password can only contain 0-9, a-z, A-Z, !, ?, #, $, _, -.";
         return errors;
     } else if (!numberRegular.test(password)) {
         errors = "Password must contain at least 1 number 0-9.";
         return errors;
     } else if (!lowercaseRegular.test(password)) {
         errors = "Password must contain at least 1 lowercase letter a-z.";
         return errors;
     } else if (!uppercaseRegular.test(password)) {
         errors = "Password must contain at least 1 uppercase letter A-Z.";
         return errors;
     } else if (!specialRegular.test(password)) {
         errors = "Password must contain at least 1 special character !, ?, #, $, _, -.";
         return errors;
     }
     return errors;
}

async function ifUsernameExist(username) {
    const start = Date.now();
    const user = await models.User.findOne({
        where: {
            username: username
        }
    })
    client.timing('check_if_user_exist_DB', Date.now() - start);

    if (user === null) {
        return false;
    }
    return true;
};

async function updateUser(authorization, userUpdate) {
    const userPass = authorization.split(' ')[1];
    const plaintext = Buffer.from(userPass, 'base64').toString('ascii');
    
    const username = plaintext.split(':')[0];
    const password = plaintext.split(':')[1];

    // To check if provide all the required info
    if (!userUpdate.hasOwnProperty("first_name") ||
        !userUpdate.hasOwnProperty("last_name") ||
        !userUpdate.hasOwnProperty("password")) {
        return Promise.reject("You didn't provide all the required information for updating");
    }

    // To check if provide extra info
    if (Object.keys(userUpdate).length > 3 || userUpdate.hasOwnProperty("username")) {
        return Promise.reject("You are only allowed to update first name, last name and password");
    }

    const userInfo = await checkInfo(username)
                        .then((userInfo) => {
                            return userInfo;
                     });

    if (!userInfo) {
        return Promise.reject("Login required, this username does not exist");
    }

    const match = await bcryptCompare(password, userInfo)
        .then((match) => {
                return match;
        });

    if (!match) {
        return Promise.reject("Login invalid");
    }

    let error;

    error = checkPassword(userUpdate.password);
    if (error) {
        return Promise.reject(error);
    }

    await bcrypt.hash(userUpdate.password, saltRounds)
        .then (async (hash) => {
            // Store hash and user data in database.
            await updateDB(username, userUpdate, hash);
        });
    return Promise.resolve("Updated successfully");
}

async function updateDB(username, userUpdate, hash) {
    const start = Date.now();
    await models.User.findOne({
        where: {
            username: username
        }
    }).then(async (user) => {
        client.timing('search_user_DB', Date.now() - start);
        await saveDB(user, userUpdate, hash);
    })
}

async function saveDB(user, userUpdate, hash) {
    user.first_name = userUpdate.first_name;
    user.last_name = userUpdate.last_name;
    user.password = hash;
    user.account_updated = Date.now();        
    await user.save().then (() => {
        return Promise.resolve("Updated");
    });
}

async function authenticateUser(authorization) {
    const userPass = authorization.split(' ')[1];
    const plaintext = Buffer.from(userPass, 'base64').toString('ascii');
    
    const username = plaintext.split(':')[0];
    const password = plaintext.split(':')[1];

    const result = { userInfo : {} , auth : false };
    
    const userInfo = await checkInfo(username)
                        .then((userInfo) => {
                            return userInfo;
                     });

    if (!userInfo) {
        return Promise.reject("This user does not exist");
    } 

    await bcryptCompare(password, userInfo)
        .then((match) => {
            result.auth = match;
        });
    result.userInfo = userInfo;
    if (!result.auth) {
        return Promise.reject("Login invalid");
    }
    return Promise.resolve(result);
}

async function bcryptCompare(password, userInfo) {
    const match = await bcrypt.compare(password, userInfo.password);
    return match;
}

async function checkInfo(username) {
    const start = Date.now();
    const userInfo = await models.User.findOne({
        where: {
            username: username
        }
    }).then((data) => {
        client.timing('check_user_info_DB', Date.now() - start);
        if (data) {
            return data.get({ plain: true });
        }
        return data;
    });       
    return userInfo;
}

const userData = {
    createUser,
    updateUser,
    authenticateUser,
    checkPassword
};

module.exports = userData;