'use strict';

const express = require('express');

const app = express();
const PORT = 3000;

const userData = require('./userData');

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
    userData.getUser(authorization)
        .then((authResult) => {
            if (authResult.auth) {
                delete authResult.userInfo.password;
                res.status(200).json(authResult.userInfo);
            } else {
                res.status(400).json({ error: "Password is invalid"});
            }
        }).catch((err) => {
            res.status(400).json({ error: err});
        })
})

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
