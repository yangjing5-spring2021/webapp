'use strict';
const router = require('express').Router();
const models = require('../models/models');
const userData = require('./userData');
const updateImage = require('../services/updateImage');
const environment = require('dotenv');
//const path = require('path');
//dotenv.config({ path: path.resolve(__dirname, './.env') });
environment.config();

const AWS = require('aws-sdk');
AWS.config.update({
    region: 'us-east-1'
});
console.log(process.env.bucket_name);
let s3 = new AWS.S3({
    Bucket: process.env.bucket_name,
     accessKeyId: process.env.access_key_id,
     secretAccessKey: process.env.secret_access_key
});
const multer = require("multer");
const multerS3 = require("multer-s3");

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

function getEC2Rolename(){
    const promise = new Promise((resolve,reject)=>{
        const metadata = new AWS.MetadataService();
        metadata.request('/latest/meta-data/iam/security-credentials/',function(err,rolename){
            if(err) reject(err);
            resolve(rolename);
        });
    });
    return promise;
};

function getEC2Credentials(rolename){
    const promise = new Promise((resolve,reject)=>{
        const metadata = new AWS.MetadataService();
        metadata.request('/latest/meta-data/iam/security-credentials/'+rolename,function(err,data){
            if(err) reject(err);
            resolve(JSON.parse(data));
        });
    });
    return promise;
};
  
function updateCredentials() {
    getEC2Rolename()
    .then((rolename)=>{
        return getEC2Credentials(rolename)
    })
    .then((credentials)=>{
        // AWS.config.accessKeyId=credentials.AccessKeyId;
        // AWS.config.secretAccessKey=credentials.SecretAccessKey;
        // AWS.config.sessionToken = credentials.Token;
        
        /*AWS.config.update({
            accessKeyId: credentials.AccessKeyId,
            secretAccessKey: credentials.SecretAccessKey,
            sessionToken: credentials.Token
        });*/
        s3 = new AWS.S3({
          Bucket: process.env.bucket_name,
          accessKeyId: credentials.AccessKeyId,
          secretAccessKey: credentials.SecretAccessKey
        });
        console.log("s3 in update");
        console.log(s3);
        return Promise.resolve(s3);
    })
    .catch((err)=>{
        console.log(err);
    });
}
  
async function deleteS3Image(s3_object_name) {
    await updateCredentials();
    const params = {
        Bucket: process.env.bucket_name,
        Key: s3_object_name
    };
    
    s3.deleteObject(params, function(err, data){
        if (err) {
            console.log("File delete failed with error " + err);
            throw err;
        }
        console.log("File deleted successfully");
    });
}
  
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
            console.log("file metadata: " + JSON.stringify(file));
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            const { v4: uuidv4 } = require('uuid');
            const file_id = uuidv4();
            const image_id = uuidv4();
            req.file_id = file_id;
            req.file_name = file.originalname;
            req.s3_object_name = image_id + "/" + file_id + "/" + file.originalname;
            console.log("s3 in multer: ");
            console.log(s3);
            cb(null, req.s3_object_name);
        },
    }),
});

router.post('/:book_id/image', function (req, res) {
    const authorization = req.headers.authorization;
    const book_id = req.params.book_id;
    const image_string = req.body;
    userData.authenticateUser(authorization)
        .then((authResult) => {
            console.log("authresult");
            if (image_string) {
                const singleUpload = upload.single("image");
                console.log("singleUpload start");
                singleUpload(req, res, async function (err) {
                    if (err) {
                        console.log("singleUpload error: " + err.message);
                        return res.status(500).json({
                            success: false,
                            errors: {
                                title: "Image Upload Error",
                                detail: err.message,
                                error: err,
                            },
                        });
                    }
                    models.File.create({
                        file_name: req.file_name,
                        s3_object_name: req.s3_object_name,
                        file_id: req.file_id,
                        created_date: new Date(),
                        user_id: authResult.userInfo.id,
                    }).then(async (addedFile) => {
                        await updateBookImages(book_id, addedFile)
                        res.status(201).json(addedFile);
                    }).catch((err) => {
                        res.status(500).json({error : err});
                    })
                });
            }
        });
})

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
                                            await deleteS3Image(deleted_s3_object_name);
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