'use strict';
const router = require('express').Router();
const models = require('../models/models');
const userData = require('./userData');

router.post('/', function (req, res) {
    const authorization = req.headers.authorization;
    const { title, author, isbn, published_date } = req.body;

    userData.authenticateUser(authorization)
        .then((authResult) => {
            if (title && author && isbn && published_date) {
                    const { v4: uuidv4 } = require('uuid');
                    const uid = uuidv4();
                    models.Book.create({
                        id: uid,
                        title: title,
                        author: author,
                        isbn: isbn,
                        published_date: published_date,
                        book_created: new Date(),
                        user_id: authResult.userInfo.id
                    }).then((addedBook) => {
                        res.status(201).json(addedBook);
                    }).catch((err) => {
                        res.status(500).json({error : err});
                    });   
            } else {
                res.status(400).json({error : "Incomplete info"});
            }
        }).catch((err) => {
            res.status(401).json({error : err});
        })   
});

router.get('/:id', function(req, res) {
    const bookId = req.params.id;
    models.Book.findOne({
        where: {
            id: bookId
        }
    }).then((data) => {
        if (data) {
            data = data.get({ plain: true });
            res.status(200).json(data);
        } else {
            res.status(200).json(data);
        }
    }).catch((err) => {
        res.status(500).json({error : err});
    }); 
})

router.delete('/:id', function(req, res) {
    const authorization = req.headers.authorization;
    const bookId = req.params.id;
    userData.authenticateUser(authorization)
        .then((authResult) => {
            const userId = authResult.userInfo.id;
            models.Book.findOne({
                where: {
                    id: bookId
                }
            }).then((data) => {
                if (data) {
                    data = data.get({ plain: true });
                    if (data.user_id === userId) {
                        models.Book.destroy({
                            where: {
                                id: bookId
                            }
                        }).then((data) => {
                            if (data) {
                                res.status(204).json({});
                            } 
                        }).catch((err) => {
                            res.status(500).json({error : err});
                        }); 
                    } else {
                        res.status(401).json({});
                    }
                } else {
                    res.status(404).json({});
                }
            }).catch((err) => {
                    res.status(500).json({error : err});
            });
    }).catch((err) => {
        res.status(401).json({error : err});
    })
})

router.get('/', function(req, res) {
    models.Book.findAll({})
    .then((data) => {
        res.status(200).json(data);
    }).catch((err) => {
        res.status(500).json({error : err});
    }); 
})

module.exports = router;