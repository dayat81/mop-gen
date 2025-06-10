const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Minio = require('minio');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

// Initialize Prisma
const prisma = new PrismaClient();

// Initialize Cognee RAG client
const cogneeRAGApiUrl = 'http://localhost:8000/process'; // Replace with actual URL
const cogneeRAGApiKey = 'your-api-key'; // Replace with actual API key

// Initialize MinIO client
const minioClient = new Minio.Client({
  endPoint: '127.0.0.1',
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

// const upload = multer({ storage: storage });

const app = express();
app.use(cors());
app.use(express.json());


// Authentication endpoint
const { login } = require('./auth/auth');
app.post('/api/auth/login', [
  check('username', 'Username is required').notEmpty(),
  check('password', 'Password is required').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;

  const result = await login(username, password);

  if (!result) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  res.json(result);
});

const { upload, processDocument } = require('./document/document');

// Document upload endpoint
app.post('/api/documents', upload.single('document'), processDocument);

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

const { generateMOP } = require('./mop/mop');

// MOP generation endpoint
app.post('/api/mops', [
  check('documentId', 'Document ID is required').notEmpty()
], generateMOP);

const { createVersion, getVersion, listVersions } = require('./version/version');

// Version control endpoints
app.post('/api/versions', createVersion);
app.get('/api/versions/:id', getVersion);
app.get('/api/versions/document/:documentId', listVersions);

// Endpoint to list all documents
app.get('/api/documents', async (req, res) => {
  try {
    const documents = await prisma.document.findMany();
    res.json(documents);
  } catch (error) {
    console.error('Error listing documents:', error);
    res.status(500).json({ message: 'Error listing documents' });
  }
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Uploads directory:', 'uploads/');
  try {
    await prisma.$connect();
    console.log('Connected to database');
  } catch (error) {
    console.error('Error connecting to database:', error);
  }

  // Test database connection and Cognee RAG integration
  try {
    const testDocument = await prisma.document.findFirst({
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log('Test document:', testDocument);
  } catch (error) {
    console.error('Error fetching test document:', error);
  }
});