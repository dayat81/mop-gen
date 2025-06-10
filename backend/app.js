const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Minio = require('minio');
const { PrismaClient } = require('@prisma/client');

// Initialize Prisma
const prisma = new PrismaClient();

// Initialize MinIO client
const minioClient = new Minio.Client({
  endPoint: 'localhost',
  port: 9000,
  useSSL: false,
  accessKey: 'minioadmin',
  secretKey: 'minioadmin'
});

const bucketName = 'mop-gen-documents';

// Check if bucket exists, create if not
minioClient.bucketExists(bucketName, function(err, exists) {
  if (err) {
    return console.log('Error checking bucket existence:', err);
  }
  if (!exists) {
    minioClient.makeBucket(bucketName, 'us-east-1', function(err) {
      if (err) {
        return console.log('Error creating bucket:', err);
      }
      console.log('Bucket created successfully');
    });
  }
});

// Configure multer for file uploads
const uploadDirectory = path.join(__dirname, 'uploads');

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

const app = express();
app.use(cors());
app.use(express.json());


// Authentication endpoint
app.post('/api/auth/login', [
  check('username', 'Username is required').notEmpty(),
  check('password', 'Password is required').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;
  const user = await prisma.user.findFirst({
    where: {
      username,
      password
    }
  });

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Create JWT token
  const token = jwt.sign({ userId: user.username }, 'secret_key', {
    expiresIn: '1h'
  });

  res.json({
    token,
    user: {
      username: user.username
    }
  });
});

// Document upload endpoint
app.post('/api/documents', upload.single('document'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const file = req.file;
  console.log('req.file:', file);
  const fileName = Date.now() + '-' + file.originalname;

  // Upload file to MinIO
  try {
    await minioClient.fPutObject(bucketName, fileName, file.path, { 'Content-Type': file.mimetype });

    // Store document information in database
    const doc = await prisma.document.create({
      data: {
        uploadedBy: 'admin', // Temporarily hardcoded
        filename: file.originalname,
        filePath: fileName, // Store MinIO file path
        status: 'uploaded',
        metadata: {},
        extractedData: {}
      }
    });
    const documentId = doc.id;

    // Delete the local file
    fs.unlinkSync(path.resolve(file.path));

    res.json({ documentId });
  } catch (err) {
    console.error('Error uploading file:', err);
    return res.status(500).json({ message: 'Error uploading file' });
  }
});

// Document status endpoint
app.get('/api/documents/:id/status', async (req, res) => {
  const { id } = req.params;
  // For MVP, we'll simulate processing status
  const doc = await prisma.document.findFirst({
    where: {
      id: req.params.id
    }
  });

  if (!doc) {
    return res.status(404).json({ message: 'Document not found' });
  }

  const statuses = ['queued', 'processing', 'completed'];
  const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
  res.json({ id, status: randomStatus });
});

// MOP generation endpoint
app.post('/api/mops', [
  check('documentId', 'Document ID is required').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { documentId } = req.body;
  const doc = await prisma.document.findFirst({
    where: {
      id: documentId
    }
  });

  if (!doc) {
    return res.status(404).json({ message: 'Document not found' });
  }

  // Generate MOP based on document data
  const simpleMOP = {
    id: documentId + '-mop',
    title: 'Generated MOP',
    version: '1.0',
    steps: [
      {
        id: 'step1',
        description: 'Connect to network device',
        commands: ['ssh user@device']
      },
      {
        id: 'step2',
        description: 'Verify connectivity',
        commands: ['ping 8.8.8.8']
      }
    ]
  };

  res.json({ mop: simpleMOP });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Uploads directory:', 'uploads/');
  await prisma.$connect();
  console.log('Connected to database');
});