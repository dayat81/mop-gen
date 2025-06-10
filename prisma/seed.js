require('dotenv').config({ path: 'backend/.env' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

async function main() {
  const hashedPasswordAdmin = await bcrypt.hash('postgres', 10);
  const user = await prisma.user.create({
    data: {
      username: 'admin',
      password: hashedPasswordAdmin,
      email: 'admin@example.com',
    },
  });

  const hashedPasswordTest = await bcrypt.hash('password', 10);
  const testUser = await prisma.user.create({
    data: {
      username: 'testuser',
      password: hashedPasswordTest,
      email: 'test@example.com',
    },
  });
  console.log({ user });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });