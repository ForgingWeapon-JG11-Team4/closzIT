const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Testing items API...\n');
  
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log('No user found in database');
    return;
  }
  
  console.log('User found:', user.email);
  console.log('User ID:', user.id);
  
  const items = await prisma.clothing.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      category: true,
      subCategory: true,
      imageUrl: true,
    }
  });
  
  console.log('\nTotal items:', items.length);
  
  const grouped = {
    outerwear: items.filter(i => i.category === 'Outer'),
    tops: items.filter(i => i.category === 'Top'),
    bottoms: items.filter(i => i.category === 'Bottom'),
    shoes: items.filter(i => i.category === 'Shoes'),
  };
  
  console.log('\nGrouped:');
  console.log('- Outerwear:', grouped.outerwear.length);
  console.log('- Tops:', grouped.tops.length);
  console.log('- Bottoms:', grouped.bottoms.length);
  console.log('- Shoes:', grouped.shoes.length);
  
  console.log('\nExpected API response format:');
  console.log(JSON.stringify(grouped, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
