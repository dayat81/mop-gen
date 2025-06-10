const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createVersion(req, res) {
  const { documentId, versionData } = req.body;

  try {
    const newVersion = await prisma.version.create({
      data: {
        documentId: documentId,
        versionData: versionData
      }
    });
    res.json(newVersion);
  } catch (error) {
    console.error('Error creating version:', error);
    res.status(500).json({ message: 'Error creating version' });
  }
}

async function getVersion(req, res) {
  const { id } = req.params;

  try {
    const version = await prisma.version.findUnique({
      where: {
        id: id
      }
    });
    if (!version) {
      return res.status(404).json({ message: 'Version not found' });
    }
    res.json(version);
  } catch (error) {
    console.error('Error getting version:', error);
    res.status(500).json({ message: 'Error getting version' });
  }
}

async function listVersions(req, res) {
  const { documentId } = req.params;

  try {
    const versions = await prisma.version.findMany({
      where: {
        documentId: documentId
      }
    });
    res.json(versions);
  } catch (error) {
    console.error('Error listing versions:', error);
    res.status(500).json({ message: 'Error listing versions' });
  }
}

module.exports = {
  createVersion,
  getVersion,
  listVersions
};