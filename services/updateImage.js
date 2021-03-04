const AWS = require('aws-sdk');

const multer = require("multer");
const multerS3 = require("multer-s3");
const s3 = new AWS.S3({
    accessKeyId: process.env.accessKeyId,
    secretAccessKey: process.env.secretAccessKey
});
const bucketName = process.env.bucketName;

function uploadS3Image(image_string, s3_object_name) {
    const params = {
        Bucket: bucketName,
        Key: s3_object_name,
        Body: new Buffer.from(image_string, 'binary')
    };
    
    s3.upload(params, function(err, data){
        if (err) {
            console.log("File upload failed with error " + err);
            throw err;
        }
        console.log("File uploaded successfully");
    });
}

function deleteS3Image(s3_object_name) {
    const params = {
        Bucket: bucketName,
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
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type, only JPEG and PNG is allowed!"), false);
    }
  };

  const upload = multer({
    fileFilter,
    storage: multerS3({
      acl: "public-read",
      s3,
      bucket: bucketName,
      metadata: function (req, file, cb) {
        cb(null, { fieldName: "TESTING_METADATA" });
      },
      key: function (req, file, cb) {
        cb(null, Date.now().toString());
      },
    }),
  });

  const updateImage = {
    uploadS3Image,
    deleteS3Image,
    upload
  }

  module.exports = updateImage;