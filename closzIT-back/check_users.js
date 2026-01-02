const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Checking all users ===\n');
  
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  
  console.log('Total users:', users.length);
  console.log('\n');
  
  users.forEach((user, index) => {
    console.log('User', index + 1, ':');
    console.log('  Email:', user.email);
    console.log('  Name:', user.name || 'No name');
    console.log('  ID:', user.id);
    console.log('  Created:', user.createdAt);
    console.log('\n');
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
