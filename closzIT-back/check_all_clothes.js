const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Checking ALL clothes in database ===\n');

  // Get all users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
    }
  });

  console.log('Total users:', users.length);
  console.log('Users:', users.map(u => u.email).join(', '));
  console.log('\n');

  // Get all clothes
  const allClothes = await prisma.clothing.findMany({
    select: {
      id: true,
      userId: true,
      category: true,
      subCategory: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log('Total clothes in database:', allClothes.length);
  console.log('\n');

  // Group by user
  for (const user of users) {
    const userClothes = allClothes.filter(c => c.userId === user.id);
    console.log('User:', user.email, user.name ? '(' + user.name + ')' : '');
    console.log('  User ID:', user.id);
    console.log('  Total clothes:', userClothes.length);

    if (userClothes.length > 0) {
      const grouped = {
        Outer: userClothes.filter(c => c.category === 'Outer').length,
        Top: userClothes.filter(c => c.category === 'Top').length,
        Bottom: userClothes.filter(c => c.category === 'Bottom').length,
        Shoes: userClothes.filter(c => c.category === 'Shoes').length,
      };
      console.log('  By category:', grouped);
      console.log('  Items:');
      userClothes.forEach(c => {
        const shortId = c.id.substring(0, 8);
        console.log('    - ' + c.category + ': ' + c.subCategory + ' (' + shortId + '...)');
      });
    }
    console.log('\n');
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
