const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getUserByUsername(username) {
  const user = await prisma.user.findFirst({
    where: {
      username
    }
  });
  await new Promise(resolve => setTimeout(resolve, 50)); // Add a 50ms delay
  return user;
}

module.exports = {
  getUserByUsername
};