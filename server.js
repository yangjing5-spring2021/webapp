'use strict';

const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;
app.use(bodyParser.json());
const logger = require("./services/logger.js");
const StatsD = require('node-statsd'),
client = new StatsD();
const userData = require('./routes/userData');
const booksRoute = require('./routes/books-route');
app.use('/books', booksRoute);

app.get('/', (req, res) => {
    res.status(200).json({});
})

app.post('/v1/user', express.json(), (req, res) => {
    logger.info("'create user' API input: " + JSON.stringify(req.body));
    client.increment('add_user_counter');
    const start = Date.now();
    const newUser = req.body;
    userData.createUser(newUser)
        .then((result) => {
            client.timing('create_user_API', Date.now() - start);
            logger.info("'create user' API output: " + JSON.stringify(result));
            res.status(201).json(result);
        })
        .catch((errors) => {
            logger.error(errors);
            res.status(400).json({ error : errors});
        });
}) 

app.put('/v1/user/self', express.json(), (req, res) => {
    const start = Date.now();
    client.increment('update_book_counter');
    logger.info("'update user' API input: " + JSON.stringify(req.body));

    const authorization = req.headers.authorization;
    const userUpdate = req.body;

    userData.updateUser(authorization, userUpdate)
        .then ( () => {
            logger.info("'update user' API success");
            client.timing('update_user_API', Date.now() - start);
            res.status(204).json({ message : "success" });
        }).catch((err) => {
            res.status(400).json({ error: err});
        });       
})

app.get('/v1/user/self', (req, res) => {
    const start = Date.now();
    client.increment('get_user_counter');
    logger.info("'get user' API input: " + JSON.stringify(req.body));

    const authorization = req.headers.authorization;
    userData.authenticateUser(authorization)
        .then((authResult) => {
                delete authResult.userInfo.password;
                logger.info("'get user' API output: " + JSON.stringify(authResult.userInfo));
                client.timing('get_user_API', Date.now() - start);
                res.status(200).json(authResult.userInfo);
        }).catch((err) => {
            res.status(400).json({ error: err});
        })
})


app.listen(PORT, () => logger.info(`http://localhost:${PORT}`));
