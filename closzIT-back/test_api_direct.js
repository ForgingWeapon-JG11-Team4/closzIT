const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userId = '62dc35bc-aa91-497b-939a-7ad43993f8c5'; // Current user
  
  console.log('Testing API logic directly...\n');
  
  const items = await prisma.clothing.findMany({
    where: { userId },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      imageUrl: true,
      category: true,
      subCategory: true,
      colors: true,
      patterns: true,
      details: true,
      styleMoods: true,
      tpos: true,
      seasons: true,
      userRating: true,
      note: true,
      wearCount: true,
      lastWorn: true,
      createdAt: true,
    },
  });
  
  console.log('Raw query result:', items.length, 'items');
  console.log(JSON.stringify(items, null, 2));
  console.log('\n');
  
  const mapped = items.map(item => ({
    id: item.id,
    name: item.subCategory,
    image: item.imageUrl,
    category: item.category,
    subCategory: item.subCategory,
    colors: item.colors,
    patterns: item.patterns,
    details: item.details,
    styleMoods: item.styleMoods,
    tpos: item.tpos,
    seasons: item.seasons,
    userRating: item.userRating,
    note: item.note,
    wearCount: item.wearCount,
    lastWorn: item.lastWorn,
    createdAt: item.createdAt,
  }));
  
  console.log('Mapped result:', mapped.length, 'items');
  console.log('\n');
  
  const grouped = {
    outerwear: mapped.filter(item => item.category === 'Outer'),
    tops: mapped.filter(item => item.category === 'Top'),
    bottoms: mapped.filter(item => item.category === 'Bottom'),
    shoes: mapped.filter(item => item.category === 'Shoes'),
  };
  
  console.log('Grouped result:');
  console.log('  outerwear:', grouped.outerwear.length);
  console.log('  tops:', grouped.tops.length);
  console.log('  bottoms:', grouped.bottoms.length);
  console.log('  shoes:', grouped.shoes.length);
  console.log('\n');
  
  console.log('Full grouped object:');
  console.log(JSON.stringify(grouped, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
