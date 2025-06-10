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

// Cognee RAG API configuration
const cogneeApiUrl = 'http://localhost:8000';
const cogneeApiKey = 'your-api-key';

/**
 * Process a document through the Cognee RAG system
 */
async function processDocument(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const file = req.file;
  console.log('req.file:', file);
  const fileName = Date.now() + '-' + file.originalname;

  try {
    // Upload file to MinIO
    await minioClient.fPutObject(bucketName, fileName, file.path, { 'Content-Type': file.mimetype });
    console.log(`File uploaded to MinIO: ${fileName}`);

    // Create initial document record with 'processing' status
    const doc = await prisma.document.create({
      data: {
        uploadedBy: req.user?.id || 'admin', // Use authenticated user ID if available
        filename: file.originalname,
        filePath: fileName,
        status: 'processing',
        metadata: {
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadDate: new Date().toISOString()
        },
        extractedData: {} // Will be updated after processing
      }
    });

    // Send document to Cognee RAG for processing
    try {
      console.log(`Sending document to Cognee RAG API: ${fileName}`);
      const cogneeResponse = await axios.post(`${cogneeApiUrl}/process`, {
        documentPath: fileName,
        documentType: file.mimetype,
        documentId: doc.id
      }, {
        headers: {
          'X-API-Key': cogneeApiKey,
          'Content-Type': 'application/json'
        }
      });

      // Update document with extracted data and status
      if (cogneeResponse.data && cogneeResponse.data.extracted_data) {
        await prisma.document.update({
          where: { id: doc.id },
          data: {
            status: 'completed',
            extractedData: cogneeResponse.data
          }
        });
        console.log(`Document processed successfully: ${doc.id}`);
      } else {
        await prisma.document.update({
          where: { id: doc.id },
          data: { status: 'failed' }
        });
        console.error('Invalid response from Cognee RAG API');
      }

      // Delete the local file
      fs.unlinkSync(path.resolve(file.path));

      // Return the document ID and initial processing status
      res.json({ 
        documentId: doc.id,
        status: 'processing',
        message: 'Document uploaded and processing started'
      });
    } catch (cogneeErr) {
      console.error('Error processing document with Cognee RAG:', cogneeErr);
      
      // Update document status to failed
      await prisma.document.update({
        where: { id: doc.id },
        data: { status: 'failed' }
      });
      
      // Delete the local file
      if (fs.existsSync(path.resolve(file.path))) {
        fs.unlinkSync(path.resolve(file.path));
      }
      
      return res.status(500).json({ 
        message: 'Error processing document with Cognee RAG',
        documentId: doc.id,
        status: 'failed'
      });
    }
  } catch (err) {
    console.error('Error uploading file:', err);
    
    // Delete the local file if it exists
    if (file && fs.existsSync(path.resolve(file.path))) {
      fs.unlinkSync(path.resolve(file.path));
    }
    
    return res.status(500).json({ message: 'Error uploading file' });
  }
}

/**
 * Get document processing status from Cognee RAG
 */
async function getDocumentStatus(req, res) {
  const { id } = req.params;
  
  try {
    // Get document from database
    const doc = await prisma.document.findUnique({
      where: { id }
    });
    
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // If document is already completed or failed, return current status
    if (doc.status === 'completed' || doc.status === 'failed') {
      return res.json({ 
        id, 
        status: doc.status,
        progress: doc.status === 'completed' ? 100 : 0
      });
    }
    
    // Check status with Cognee RAG API
    try {
      const statusResponse = await axios.get(`${cogneeApiUrl}/status/${id}`, {
        headers: { 'X-API-Key': cogneeApiKey }
      });
      
      const statusData = statusResponse.data;
      
      // Update document status in database if needed
      if (statusData.status !== doc.status) {
        await prisma.document.update({
          where: { id },
          data: { 
            status: statusData.status,
            // If processing completed, update with extracted data
            ...(statusData.status === 'completed' && statusData.extracted_data 
              ? { extractedData: statusData.extracted_data } 
              : {})
          }
        });
      }
      
      res.json({
        id,
        status: statusData.status,
        progress: statusData.progress || 0,
        ...(statusData.error ? { error: statusData.error } : {})
      });
    } catch (statusErr) {
      console.error('Error checking document status:', statusErr);
      res.json({ id, status: doc.status, progress: 0 });
    }
  } catch (err) {
    console.error('Error getting document status:', err);
    res.status(500).json({ message: 'Error getting document status' });
  }
}

/**
 * List all documents
 */
async function listDocuments(req, res) {
  try {
    const documents = await prisma.document.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(documents);
  } catch (err) {
    console.error('Error listing documents:', err);
    res.status(500).json({ message: 'Error listing documents' });
  }
}

/**
 * Delete a document
 */
async function deleteDocument(req, res) {
  const { id } = req.params;
  
  try {
    // Get document from database
    const doc = await prisma.document.findUnique({
      where: { id }
    });
    
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Delete file from MinIO
    try {
      await minioClient.removeObject(bucketName, doc.filePath);
    } catch (minioErr) {
      console.error('Error deleting file from MinIO:', minioErr);
      // Continue with deletion even if MinIO delete fails
    }
    
    // Delete document from database
    await prisma.document.delete({
      where: { id }
    });
    
    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    console.error('Error deleting document:', err);
    res.status(500).json({ message: 'Error deleting document' });
  }
}

module.exports = {
  upload,
  processDocument,
  getDocumentStatus,
  listDocuments,
  deleteDocument
};
