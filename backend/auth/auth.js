const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function login(username, password) {
  const user = await prisma.user.findFirst({
    where: {
      username,
      password
    }
  });

  if (!user) {
    return null;
  }

  // Create JWT token
  const token = jwt.sign({ userId: user.username }, 'secret_key', {
    expiresIn: '1h'
  });

  return {
    token,
    user: {
      username: user.username
    }
  };
}

module.exports = {
  login
};