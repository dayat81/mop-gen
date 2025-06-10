const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Minio = require('minio');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

const minioClient = new Minio.Client({
  endPoint: '127.0.0.1',
  port: 9000,
  useSSL: false,
  accessKey: 'minioadmin',
  secretKey: 'minioadmin'
});

const bucketName = 'mop-gen-documents';

const uploadDirectory = path.join(__dirname, '../uploads');

// Create the uploads directory if it doesn't exist
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDirectory);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

async function processDocument(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const file = req.file;
  console.log('req.file:', file);
  const fileName = Date.now() + '-' + file.originalname;

  // Upload file to MinIO
  try {
    await minioClient.fPutObject(bucketName, fileName, file.path, { 'Content-Type': file.mimetype });

    // Send document to Cognee RAG for processing
    try {
      const cogneeResponse = await axios.post('http://localhost:8000/process', {
        documentPath: fileName, // Send MinIO file path
        documentType: file.mimetype
      }, {
        headers: {
          'X-API-Key': 'your-api-key'
        }
      });

      const extractedData = cogneeResponse.data;

      // Store document information in database
      const doc = await prisma.document.create({
        data: {
          uploadedBy: 'admin', // Temporarily hardcoded
          filename: file.originalname,
          filePath: fileName, // Store MinIO file path
          status: 'uploaded',
          metadata: {},
          extractedData: extractedData
        }
      });
      const documentId = doc.id;

      // Delete the local file
      fs.unlinkSync(path.resolve(file.path));

      res.json({ documentId });
    } catch (cogneeErr) {
      console.error('Error processing document with Cognee RAG:', cogneeErr);
      return res.status(500).json({ message: 'Error processing document with Cognee RAG' });
    }
  } catch (err) {
    console.error('Error uploading file:', err);
    return res.status(500).json({ message: 'Error uploading file' });
  }
}

module.exports = {
  upload,
  processDocument
};