const request = require('supertest');
const app = require('../app');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

describe('Integration Tests', () => {
  let documentId;
  let mopId;
  let reviewId;

  // Create a test document
  beforeAll(async () => {
    // Create test directories if they don't exist
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    // Create a test document in the database
    const document = await prisma.document.create({
      data: {
        uploadedBy: 'test-user',
        filename: 'test-document.pdf',
        filePath: 'test-document.pdf',
        status: 'completed',
        metadata: {
          fileSize: 1024,
          mimeType: 'application/pdf',
          uploadDate: new Date().toISOString()
        },
        extractedData: {
          extracted_data: {
            device_type: 'router',
            vendor: 'cisco',
            model: 'ISR4321',
            interfaces: [
              {
                name: 'GigabitEthernet0/0/0',
                ip: '192.168.1.1',
                subnet: '255.255.255.0'
              }
            ],
            routing_protocols: ['ospf']
          }
        }
      }
    });

    documentId = document.id;
  });

  // Clean up after tests
  afterAll(async () => {
    // Delete test data
    if (reviewId) {
      await prisma.review.delete({
        where: { id: reviewId }
      }).catch(() => {});
    }

    if (mopId) {
      await prisma.mOP.delete({
        where: { id: mopId }
      }).catch(() => {});
    }

    if (documentId) {
      await prisma.document.delete({
        where: { id: documentId }
      }).catch(() => {});
    }

    await prisma.$disconnect();
  });

  // Test document status endpoint
  test('GET /api/documents/:id/status should return document status', async () => {
    const response = await request(app)
      .get(`/api/documents/${documentId}/status`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', documentId);
    expect(response.body).toHaveProperty('status', 'completed');
  });

  // Test MOP generation
  test('POST /api/mops should generate a MOP from a document', async () => {
    const response = await request(app)
      .post('/api/mops')
      .send({ documentId });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('mop');
    expect(response.body.mop).toHaveProperty('id');
    expect(response.body.mop).toHaveProperty('title');
    expect(response.body.mop).toHaveProperty('steps');
    expect(response.body.mop.steps.length).toBeGreaterThan(0);

    mopId = response.body.mop.id;
  });

  // Test get MOP by ID
  test('GET /api/mops/:id should return a MOP', async () => {
    if (!mopId) {
      throw new Error('MOP ID not set');
    }

    const response = await request(app)
      .get(`/api/mops/${mopId}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('mop');
    expect(response.body.mop).toHaveProperty('id', mopId);
    expect(response.body.mop).toHaveProperty('steps');
  });

  // Test review creation
  test('POST /api/reviews should create a review for a MOP', async () => {
    if (!mopId) {
      throw new Error('MOP ID not set');
    }

    const response = await request(app)
      .post('/api/reviews')
      .send({
        mopId,
        comments: 'Test review',
        status: 'pending'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('mopId', mopId);
    expect(response.body).toHaveProperty('comments', 'Test review');
    expect(response.body).toHaveProperty('status', 'pending');

    reviewId = response.body.id;
  });

  // Test get reviews for a MOP
  test('GET /api/mops/:mopId/reviews should return reviews for a MOP', async () => {
    if (!mopId) {
      throw new Error('MOP ID not set');
    }

    const response = await request(app)
      .get(`/api/mops/${mopId}/reviews`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toHaveProperty('id', reviewId);
  });

  // Test MOP approval
  test('POST /api/mops/:id/approve should approve a MOP', async () => {
    if (!mopId) {
      throw new Error('MOP ID not set');
    }

    const response = await request(app)
      .post(`/api/mops/${mopId}/approve`)
      .send({
        comments: 'Approved by integration test'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'MOP approved successfully');
    expect(response.body).toHaveProperty('mop');
    expect(response.body.mop).toHaveProperty('status', 'approved');
  });

  // Test export MOP
  test('GET /api/mops/:id/export should export a MOP', async () => {
    if (!mopId) {
      throw new Error('MOP ID not set');
    }

    const response = await request(app)
      .get(`/api/mops/${mopId}/export?format=txt`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('url');
    expect(response.body).toHaveProperty('format', 'txt');
    expect(response.body).toHaveProperty('filename');
  });
});
