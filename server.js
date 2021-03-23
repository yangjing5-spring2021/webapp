'use strict';

const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;
app.use(bodyParser.json());

const userData = require('./routes/userData');
const booksRoute = require('./routes/books-route');
app.use('/mybooks', booksRoute);

app.post('/v1/user', express.json(), (req, res) => {
    const newUser = req.body;
    userData.createUser(newUser)
        .then((result) => {
            res.status(201).json(result);
        })
        .catch((errors) => {
            res.status(400).json({ error : errors});
        });
}) 

app.put('/v1/user/self', express.json(), (req, res) => {
    const authorization = req.headers.authorization;
    const userUpdate = req.body;

    userData.updateUser(authorization, userUpdate)
        .then ( () => {
            res.status(204).json({ message : "success" });
        }).catch((err) => {
            res.status(400).json({ error: err});
        });       
})

app.get('/v1/user/self', (req, res) => {
    const authorization = req.headers.authorization;
    userData.authenticateUser(authorization)
        .then((authResult) => {
                delete authResult.userInfo.password;
                res.status(200).json(authResult.userInfo);
        }).catch((err) => {
            res.status(400).json({ error: err});
        })
})


app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
