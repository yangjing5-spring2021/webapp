const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
let s3;

const multer = require("multer");
const multerS3 = require("multer-s3");
//const environment = require('dotenv');
//environment.config();

//const bucketName = process.env.bucket_name;


function getEC2Rolename(AWS){
  var promise = new Promise((resolve,reject)=>{
      
      var metadata = new AWS.MetadataService();
      
      metadata.request('/latest/meta-data/iam/security-credentials/',function(err,rolename){
          if(err) reject(err);
          console.log(rolename);            
          resolve(rolename);
      });
  });
      
  return promise;
};

function getEC2Credentials(AWS,rolename){
  var promise = new Promise((resolve,reject)=>{
      
      var metadata = new AWS.MetadataService();
      
      metadata.request('/latest/meta-data/iam/security-credentials/'+rolename,function(err,data){
          if(err) reject(err);   
          
          resolve(JSON.parse(data));            
      });
  });
      
  return promise;
};

  getEC2Rolename(AWS)
  .then((rolename)=>{
      return getEC2Credentials(AWS,rolename)
  })
  .then((credentials)=>{
      AWS.config.AWS_ACCESS_KEY_ID=credentials.AccessKeyId;
      AWS.config.AWS_SECRET_ACCESS_KEY=credentials.SecretAccessKey;
      AWS.config.AWS_SESSION_TOKEN = credentials.Token;
      s3 = new AWS.S3({
        Bucket: process.env.bucket_name,
        accessKeyId: credentials.AccessKeyId,
        secretAccessKey: credentials.SecretAccessKey
      });
  })
  .catch((err)=>{
      console.log(err);
  });


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
        //req.encoding = file.encoding;
        //req.mimetype = file.mimetype;
        //console.log("req.file_id: " + req.file_id);
        //console.log("file.originalname: " + file.originalname);
        //console.log("req.s3_object_name: " + req.s3_object_name);
        //console.log("file.encoding: " + file.encoding);
        //console.log("file.mimetype: " + file.mimetype);
        //console.log("file key: " + JSON.stringify(file));
        console.log("s3: " + JSON.stringify(s3));
        console.log("s3: " + s3);
        cb(null, req.s3_object_name);
      },
    }),
  });

  const updateImage = {
    uploadS3Image,
    deleteS3Image,
    upload,
    updateCredentials
  }

  module.exports = updateImage;