const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const bcrypt = require('bcrypt');

async function login(username, password) {
  const user = await prisma.user.findFirst({
    where: {
      username
    },
  });

  if (!user) {
    return null;
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  
  if (!passwordMatch) {
    return null;
  }

  // Create JWT token
  const token = jwt.sign({ userId: user.username }, process.env.JWT_SECRET, {
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