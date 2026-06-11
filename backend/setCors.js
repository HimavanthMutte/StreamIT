const { S3Client, PutBucketCorsCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const corsParams = {
  Bucket: process.env.AWS_BUCKET_NAME,
  CORSConfiguration: {
    CORSRules: [
      {
        AllowedHeaders: ['*'],
        AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
        AllowedOrigins: ['*'],
        ExposeHeaders: ['ETag'],
        MaxAgeSeconds: 3000,
      },
    ],
  },
};

const run = async () => {
  try {
    const data = await client.send(new PutBucketCorsCommand(corsParams));
    console.log("Success, CORS set", data);
  } catch (err) {
    console.log("Error", err);
  }
};
run();
