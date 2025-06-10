const { check, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function generateMOP(req, res) {
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
}

module.exports = {
  generateMOP
};