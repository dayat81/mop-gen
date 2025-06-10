require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5, // max 5 attempts per window
  message: 'Too many login attempts from this IP, please try again after an hour'
});
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Minio = require('minio');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const bcrypt = require('bcrypt');

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
app.post('/api/auth/login', loginLimiter, [
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

// Registration endpoint
app.post('/api/auth/register', [
  check('username', 'Username is required').notEmpty(),
  check('password', 'Password is required').notEmpty()
  .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).*$/)
  .withMessage('Password must include at least one uppercase letter, one lowercase letter, one number, and one special character'),
  check('email', 'Email is required').isEmail()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password, email } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const existingUser = await prisma.user.findUnique({
      where: {
        username: username,
      },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        email,
      },
    });

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Error registering user' });
  }
});

// Document endpoints
const { upload, processDocument, getDocumentStatus, listDocuments, deleteDocument } = require('./document/document');

// Document upload endpoint
app.post('/api/documents', upload.single('document'), processDocument);

// Document status endpoint
app.get('/api/documents/:id/status', getDocumentStatus);

// Document list endpoint
app.get('/api/documents', listDocuments);

// Document delete endpoint
app.delete('/api/documents/:id', deleteDocument);

// MOP endpoints
const { generateMOP, getMOP, listMOPs, updateMOP, deleteMOP } = require('./mop/mop');

// MOP generation endpoint
app.post('/api/mops', [
  check('documentId', 'Document ID is required').notEmpty()
], generateMOP);

// Get MOP by ID
app.get('/api/mops/:id', getMOP);

// List all MOPs
app.get('/api/mops', listMOPs);

// Update MOP
app.put('/api/mops/:id', updateMOP);

// Delete MOP
app.delete('/api/mops/:id', deleteMOP);

const { createVersion, getVersion, listVersions } = require('./version/version');

// Version control endpoints
app.post('/api/versions', createVersion);
app.get('/api/versions/:id', getVersion);
app.get('/api/versions/document/:documentId', listVersions);

// Review endpoints
const { 
  createReview, 
  getReview, 
  listReviews, 
  updateReview, 
  deleteReview,
  approveMOP,
  rejectMOP,
  getPendingReviews
} = require('./review/review');

// Review CRUD endpoints
app.post('/api/reviews', [
  check('mopId', 'MOP ID is required').notEmpty()
], createReview);
app.get('/api/reviews/:id', getReview);
app.get('/api/mops/:mopId/reviews', listReviews);
app.put('/api/reviews/:id', updateReview);
app.delete('/api/reviews/:id', deleteReview);

// MOP approval/rejection endpoints
app.post('/api/mops/:id/approve', approveMOP);
app.post('/api/mops/:id/reject', rejectMOP);

// Get pending reviews
app.get('/api/reviews/pending', getPendingReviews);

// Export endpoints
const { exportMOP } = require('./export/export');

// Export MOP
app.get('/api/mops/:id/export', exportMOP);


module.exports = app;

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, async () => {
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
