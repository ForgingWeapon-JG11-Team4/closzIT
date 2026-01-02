const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.clothing.count();
  console.log('Total clothes count:', count);
  
  const items = await prisma.clothing.findMany({
    take: 5,
    select: {
      id: true,
      userId: true,
      category: true,
      subCategory: true,
      imageUrl: true,
    }
  });
  console.log('Sample items:', JSON.stringify(items, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
