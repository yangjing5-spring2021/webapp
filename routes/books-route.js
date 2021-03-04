'use strict';
const router = require('express').Router();
const models = require('../models/models');
const userData = require('./userData');
const updateImage = require('../services/updateImage');
const environment = require('dotenv');
environment.config();

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
                        user_id: authResult.userInfo.id,
                        book_images: []
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

router.post('/:book_id/image', function (req, res) {
    const authorization = req.headers.authorization;
    const book_id = req.params.book_id;
    const image_string = req.body;
    // req.files.uploadedFileName.data;
    // const json_response = { file_name: "image.jpg", s3_object_name: "ad79de23-6820-482c-8d2b-d513885b0e17/9afdf82d-7e8e-4491-90d3-ff0499bf6afe/image.jpg", file_id: "9afdf82d-7e8e-4491-90d3-ff0499bf6afe", created_date: new Date(), user_id: "d290f1ee-6c54-4b01-90e6-d701748f0851" };
    console.log("req.file: " + req.file);
    userData.authenticateUser(authorization)
        .then((authResult) => {
            if (image_string) {
                const { v4: uuidv4 } = require('uuid');
                const file_name = "image.jpg";
                const file_id = uuidv4();
                const s3_object_name = file_id + "/" + uuidv4() + "/" + file_name;
                
                models.File.create({
                    file_name: file_name,
                    s3_object_name: s3_object_name,
                    file_id: file_id,
                    created_date: new Date(),
                    user_id: authResult.userInfo.id
                }).then(async (addedFile) => {
                    await updateImage.uploadS3Image(image_string, s3_object_name);
                    // upload successfully
                    await updateBookImages(book_id, addedFile)
                    res.status(201).json(addedFile);
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



router.delete('/:book_id/image/:image_id', function(req, res) {
    const authorization = req.headers.authorization;
    const book_id = req.params.book_id;
    const image_id = req.params.image_id;
    userData.authenticateUser(authorization)
        .then((authResult) => {
            const userId = authResult.userInfo.id;
            models.File.findOne({
                where: {
                    file_id: image_id
                }
            }).then((data) => {
                if (data) {
                    data = data.get({ plain: true });
                    const deleted_s3_object_name = data.s3_object_name;
                    if (data.user_id === userId) {
                        models.File.destroy({
                            where: {
                                file_id: image_id
                            }
                        }).then((data) => {
                            deleteBookImages(book_id, image_id)
                                    .then(async () => {
                                        if (data) {
                                            await updateImage.deleteS3Image(deleted_s3_object_name);
                                            // delete succesfully
                                            res.status(204).json({});
                                        } 
                                    }).catch(() => {
                                        res.status(404).json({});
                                    })                               
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

async function updateBookImages(book_id, file) {
    await models.Book.findOne({
        where: {
            id: book_id
        }
    }).then(async (book) => {
        await saveBookImages(book, file);
    })
}

async function saveBookImages(book, file) {
    const images = book.book_images;
    if (images) {
        images.push(file);
    } else {
        images = [file];
    }
    book.book_images = images;
    await book.save().then (() => {
        return Promise.resolve("Updated");
    });
}

async function deleteBookImages(book_id, image_id) {
    await models.Book.findOne({
        where: {
            id: book_id
        }
    }).then(async (book) => {
        //await saveBookImages(book, file);
        const images = book.book_images;
        if (images) {
            var index = -1;
            for (let i = 0; i < images.length; i++) {
                if (images[i].file_id == image_id) {
                    index = i;
                    break;
                }
            }
            if (index != -1) {
                images.splice(index, 1);
            } else {
                return Promise.reject("There is no such image");
            }
        } else {
            return Promise.reject("There is no such image");
        }
        book.book_images = images;
        await book.save();
        return Promise.resolve("success");
    })
}

module.exports = router;