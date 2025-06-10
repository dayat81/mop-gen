const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getUserByUsername(username) {
  return await prisma.user.findFirst({
    where: {
      username
    }
  });
}

module.exports = {
  getUserByUsername
};