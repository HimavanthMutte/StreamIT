const { S3Client, CreateMultipartUploadCommand, CompleteMultipartUploadCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { UploadPartCommand } = require('@aws-sdk/client-s3');
const Room = require('../models/Room');
const crypto = require('crypto');

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

exports.startMultipartUpload = async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { fileName, fileType } = req.body;

    const key = `rooms/${roomCode}/${crypto.randomBytes(8).toString('hex')}-${fileName}`;

    const command = new CreateMultipartUploadCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });

    const uploadResult = await s3Client.send(command);

    res.status(200).json({
      uploadId: uploadResult.UploadId,
      key: key,
    });
  } catch (error) {
    console.error('Error starting multipart upload:', error);
    res.status(500).json({ message: 'Error starting multipart upload' });
  }
};

exports.getPresignedUrls = async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { key, uploadId, parts } = req.body;

    const urls = [];
    for (let i = 0; i < parts; i++) {
      const partNumber = i + 1;
      const command = new UploadPartCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
      });

      const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      urls.push({ partNumber, url });
    }

    res.status(200).json({ urls });
  } catch (error) {
    console.error('Error getting presigned urls:', error);
    res.status(500).json({ message: 'Error getting presigned urls' });
  }
};

exports.completeMultipartUpload = async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { key, uploadId, parts } = req.body;

    // The ETags returned by S3 might have extra quotes around them depending on how the frontend extracts them, we should be safe.
    // AWS SDK expects { ETag, PartNumber }
    const command = new CompleteMultipartUploadCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.sort((a, b) => a.PartNumber - b.PartNumber),
      },
    });

    await s3Client.send(command);

    const videoUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    // Update the room with the video URL
    const room = await Room.findOneAndUpdate(
      { roomCode },
      { videoUrl },
      { new: true }
    );

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.status(200).json({ videoUrl });
  } catch (error) {
    console.error('Error completing multipart upload:', error);
    res.status(500).json({ message: 'Error completing multipart upload' });
  }
};

exports.getVideoUrl = async (req, res) => {
  try {
    const { roomCode } = req.params;
    const room = await Room.findOne({ roomCode });
    
    if (!room || !room.videoUrl) {
      return res.status(404).json({ message: 'Video not found for this room' });
    }

    // Extract key from the videoUrl
    // Assuming videoUrl is of format: https://bucket.s3.region.amazonaws.com/rooms/TEST/...
    const urlObj = new URL(room.videoUrl);
    const key = decodeURIComponent(urlObj.pathname.substring(1));

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });

    // Generate a presigned URL valid for 12 hours
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 12 * 3600 });
    
    res.status(200).json({ url: presignedUrl });
  } catch (error) {
    console.error('Error getting presigned video url:', error);
    res.status(500).json({ message: 'Error getting presigned video url' });
  }
};
