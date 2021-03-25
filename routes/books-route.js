'use strict';
const router = require('express').Router();
const models = require('../models/models');
const userData = require('./userData');
//const updateImage = require('../services/updateImage');
const environment = require('dotenv');
//const path = require('path');
//dotenv.config({ path: path.resolve(__dirname, './.env') });
environment.config();

const AWS = require('aws-sdk');
AWS.config.update({
    region: 'us-east-1'
});
let s3 = new AWS.S3({
    Bucket: process.env.bucket_name,
    accessKeyId: process.env.access_key_id,
    secretAccessKey: process.env.secret_access_key
});
const multer = require("multer");
const multerS3 = require("multer-s3");
const logger = require("../services/logger.js");
const StatsD = require('node-statsd'),
client = new StatsD();

router.post('/', function (req, res) {
    const startAPI = Date.now(); 
    client.increment('add_book_counter');
    logger.info("'create book' API input: " + JSON.stringify(req.body));
    const authorization = req.headers.authorization;
    const { title, author, isbn, published_date } = req.body;
    userData.authenticateUser(authorization)
        .then((authResult) => {
            if (title && author && isbn && published_date) {
                    const { v4: uuidv4 } = require('uuid');
                    const uid = uuidv4();
                    const DBStartTime = Date.now();
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
                        const currentTime = Date.now();
                        client.timing('add_book_DB', currentTime - DBStartTime);
                        logger.info("'crate book' API output: " + JSON.stringify(addedBook));
                        const timeTaken = Date.now() - startAPI;
                        client.timing('add _book_API', timeTaken);
                        res.status(201).json(addedBook);
                    }).catch((err) => {
                        logger.error("Database server error");
                        logger.error(err);
                        res.status(500).json({error : err});
                    });   
            } else {
                logger.warn("Incomplete info");
                res.status(400).json({error : "Incomplete info"});
            }
        }).catch((err) => {
            logger.error(JSON.stringify(err));
            res.status(401).json({error : err});
        })   
});

router.get('/:id', function(req, res) {
    const start = Date.now();
    client.increment('get_book_counter');
    logger.info("'get book' API input: " + JSON.stringify(req.body));

    const bookId = req.params.id;
    const startDB = Date.now();
    models.Book.findOne({
        where: {
            id: bookId
        }
    }).then((data) => {
        client.timing('search_book_DB', Date.now() - startDB);

        if (data) {
            data = data.get({ plain: true });
            logger.info("get_book_API output: " + JSON.stringify(data));
            client.timing('get_book_API', Date.now() - start);
            res.status(200).json(data);
        } else {
            res.status(400).json({Message: "no this book"});
        }
    }).catch((err) => {
        res.status(500).json({error : err});
    }); 
})

router.delete('/:id', function(req, res) {
    const start = Date.now();
    client.increment('delete_book_counter');
    logger.info("'delete book' API input: " + JSON.stringify(req.body));

    const authorization = req.headers.authorization;
    const bookId = req.params.id;
    userData.authenticateUser(authorization)
        .then((authResult) => {
            const userId = authResult.userInfo.id;
            const startDB = Date.now();
            models.Book.findOne({
                where: {
                    id: bookId
                }
            }).then((data) => {
                client.timing('search_book_DB_when_delete', Date.now() - startDB);

                if (data) {
                    data = data.get({ plain: true });
                    if (data.user_id === userId) {
                        const startDestroy = Date.now();
                        models.Book.destroy({
                            where: {
                                id: bookId
                            }
                        }).then((data) => {
                            client.timing('delete_book_DB', Date.now() - startDestroy);

                            if (data) {
                                logger.info("delete_book_API output: " + JSON.stringify(data));
                                client.timing('delete_book_API', Date.now() - start);
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
    const start = Date.now();
    client.increment('get_all_books_counter');
    logger.info("'get all books' API input: " + JSON.stringify(req.body));

    const startDB = Date.now();
    models.Book.findAll({})
    .then((data) => {
        client.timing('search_all_books_DB', Date.now() - startDB);
        logger.info("get_all_books_API output: " + JSON.stringify(data));
        client.timing('get_all_books_API', Date.now() - start);
        res.status(200).json(data);
    }).catch((err) => {
        res.status(500).json({error : err});
    }); 
})
  
const fileFilter = (req, file, cb) => {
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/jpg" || file.mimetype === "image/png") {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type, only JPEG and PNG is allowed!"), false);
    }
};

const upload = multer({
    fileFilter,
    storage: multerS3({
        acl: "public-read",
        s3: s3,
        bucket: process.env.bucket_name,
        metadata: function (req, file, cb) {
            //console.log("file metadata: " + JSON.stringify(file));
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            const { v4: uuidv4 } = require('uuid');
            const file_id = uuidv4();
            const image_id = uuidv4();
            req.file_id = file_id;
            req.file_name = file.originalname;
            req.s3_object_name = image_id + "/" + file_id + "/" + file.originalname;
            //console.log("s3 in multer: ");
            //console.log(s3);
            cb(null, req.s3_object_name);
        },
    }),
});

router.post('/:book_id/image', function (req, res) {
    const start = Date.now();
    client.increment('add_image_counter');
    logger.info("'add image' API input: " + JSON.stringify(req.body));

    const authorization = req.headers.authorization;
    const book_id = req.params.book_id;
    const image_string = req.body;
    userData.authenticateUser(authorization)
        .then((authResult) => {
            if (image_string) {
                const singleUpload = upload.single("image");
                const s3Start = Date.now();
                singleUpload(req, res, async function (err) {
                    if (err) {
                        return res.status(500).json({
                            success: false,
                            errors: {
                                title: "Image Upload Error",
                                detail: err.message,
                                error: err,
                            },
                        });
                    }
                    client.timing('upload_image_S3', Date.now() - s3Start);
                    const startDB = Date.now();
                    models.File.create({
                        file_name: req.file_name,
                        s3_object_name: req.s3_object_name,
                        file_id: req.file_id,
                        created_date: new Date(),
                        user_id: authResult.userInfo.id,
                    }).then(async (addedFile) => {
                        client.timing('add_image_DB', Date.now() - startDB);

                        await updateBookImages(book_id, addedFile);

                        logger.info("add_image_API output: " + JSON.stringify(addedFile));
                        client.timing('add_image_API', Date.now() - start);
                        res.status(201).json(addedFile);
                    }).catch((err) => {
                        res.status(500).json({error : err});
                    })
                });
            }
        }).catch((err) => {
            res.status(401).json({error : err});
        });
})

router.delete('/:book_id/image/:image_id', function(req, res) {
    const start = Date.now();
    client.increment('delete_image_counter');
    logger.info("'delete image' API input: " + JSON.stringify(req.body));

    const authorization = req.headers.authorization;
    const book_id = req.params.book_id;
    const image_id = req.params.image_id;
    userData.authenticateUser(authorization)
        .then((authResult) => {
            const userId = authResult.userInfo.id;
            const startDB = Date.now();
            models.File.findOne({
                where: {
                    file_id: image_id
                }
            }).then((data) => {
                client.timing('search_image_DB', Date.now() - startDB);

                if (data) {
                    data = data.get({ plain: true });
                    const deleted_s3_object_name = data.s3_object_name;
                    if (data.user_id === userId) {
                        const startDeleteDB = Date.now();
                        models.File.destroy({
                            where: {
                                file_id: image_id
                            }
                        }).then((data) => {
                            client.timing('delete_image_DB', Date.now() - startDeleteDB);

                            deleteBookImages(book_id, image_id)
                                    .then(async () => {
                                        if (data) {
                                            await deleteS3Image(deleted_s3_object_name);
                                            logger.info("delete_image_API success");
                                            client.timing('delete_image_API', Date.now() - start);
                                            // delete succesfully
                                            res.status(204).json({});
                                        } 
                                    }).catch((err) => {
                                        logger.error("error:" + JSON.stringify(err));
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
    const startDB = Date.now();
    await models.Book.findOne({
        where: {
            id: book_id
        }
    }).then(async (book) => {
        client.timing('search_book_DB_update_image', Date.now() - startDB);
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
    const startDB = Date.now();
    await book.save().then (() => {
        client.timing('add_image_DB', Date.now() - startDB);
        return Promise.resolve("Updated");
    });
}

async function deleteBookImages(book_id, image_id) {
    const startDB = Date.now();
    await models.Book.findOne({
        where: {
            id: book_id
        }
    }).then(async (book) => {
        client.timing('search_book_DB_delete_image', Date.now() - startDB);

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
        const startDBsave = Date.now();
        await book.save();
        client.timing('save_book_DB_delete_image', Date.now() - startDBsave);
        return Promise.resolve("success");
    })
}


async function deleteS3Image(s3_object_name) {
    //await updateCredentials();
    const params = {
        Bucket: process.env.bucket_name,
        Key: s3_object_name
    };
    const startS3 = Date.now();
    s3.deleteObject(params, function(err, data){
        if (err) {
            logger.error("File delete failed with error " + JSON.stringify(err));
            throw err;
        }
        client.timing('delete_image_S3', Date.now() - startS3);
        logger.info("File deleted successfully");
    });
}

module.exports = router;