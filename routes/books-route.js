'use strict';
const router = require('express').Router();
const Book = require('../models/book');
const userData = require('../userData');

router.post('/', function (req, res) {
    const authorization = req.headers.authorization;
    //console.log(req.body);
    const { title, author, isbn, published_date } = req.body;

    userData.authenticateUser(authorization)
        .then((authResult) => {
            //console.log("book0");
            // Book.addBook(book, result.userInfo.id)
            // .then((addedBook) => {
            //     res.status(201).json(addedBook);
            // })
            // .catch((err) => {
            //     Promise.reject(err);
            // })
            if (title && author && isbn && published_date) {
                    //console.log("book1");
                    const { v4: uuidv4 } = require('uuid');
                    const uid = uuidv4();
                    Book.create({
                        id: uid,
                        title: title,
                        author: author,
                        isbn: isbn,
                        published_date: published_date,
                        book_created: new Date(),
                        user_id: authResult.userInfo.id
                    }).then((addedBook) => {
                        //console.log(addedBook);
                        // if (data) {
                        //     return data.get({ plain: true });
                        // }
                        res.status(201).json(addedBook);
                    }).catch((err) => {
                        //console.log("book1 catch");
                        res.status(500).json({error : err});
                    });   
            } else {
                //console.log("books2");
                res.status(400).json({error : "Incomplete info"});
            }
        }).catch((err) => {
            //console.log("aaa");
            res.status(401).json({error : err});
        })   
});

router.get('/:id', function(req, res) {
    const bookId = req.params.id;
    Book.findOne({
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
            Book.findOne({
                where: {
                    id: bookId
                }
            }).then((data) => {
                if (data) {
                    data = data.get({ plain: true });
                    console.log(data);
                    console.log(userId);
                    if (data.user_id === userId) {
                        Book.destroy({
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
                        console.log("401");
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
    Book.findAll({})
    .then((data) => {
        res.status(200).json(data);
    }).catch((err) => {
        res.status(500).json({error : err});
    }); 
})

module.exports = router;