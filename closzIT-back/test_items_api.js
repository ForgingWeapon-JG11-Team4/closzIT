const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get a user ID from database
  const user = await prisma.user.findFirst();
  console.log('User ID:', user ? user.id : 'No user found');

  if (user) {
    const items = await prisma.clothing.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        category: true,
        subCategory: true,
        imageUrl: true,
      }
    });

    console.log('\nItems for user:');
    items.forEach(item => {
      const shortId = item.id.substring(0, 8);
      console.log('- ' + item.category + ': ' + item.subCategory + ' (ID: ' + shortId + '...)');
    });

    // Group by category
    const grouped = {
      outerwear: items.filter(i => i.category === 'Outer'),
      tops: items.filter(i => i.category === 'Top'),
      bottoms: items.filter(i => i.category === 'Bottom'),
      shoes: items.filter(i => i.category === 'Shoes'),
    };

    console.log('\nGrouped by category:');
    console.log('Outerwear:', grouped.outerwear.length);
    console.log('Tops:', grouped.tops.length);
    console.log('Bottoms:', grouped.bottoms.length);
    console.log('Shoes:', grouped.shoes.length);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
