import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Password hashing helper
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  console.log('🌱 Seeding database...');

  // Create Categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'earthquake' },
      update: {},
      create: {
        name: 'Earthquake Relief',
        slug: 'earthquake',
        description: 'Support earthquake victims with immediate relief and reconstruction efforts',
        icon: '🏚️',
        color: '#EF4444',
        sortOrder: 1,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'flood' },
      update: {},
      create: {
        name: 'Flood Relief',
        slug: 'flood',
        description: 'Help communities affected by flooding disasters',
        icon: '🌊',
        color: '#3B82F6',
        sortOrder: 2,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'medical' },
      update: {},
      create: {
        name: 'Medical Aid',
        slug: 'medical',
        description: 'Provide medical supplies and healthcare to those in need',
        icon: '🏥',
        color: '#10B981',
        sortOrder: 3,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'education' },
      update: {},
      create: {
        name: 'Education',
        slug: 'education',
        description: 'Support educational initiatives and school reconstruction',
        icon: '📚',
        color: '#8B5CF6',
        sortOrder: 4,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'humanitarian' },
      update: {},
      create: {
        name: 'Humanitarian Aid',
        slug: 'humanitarian',
        description: 'General humanitarian assistance for crisis situations',
        icon: '🤝',
        color: '#F59E0B',
        sortOrder: 5,
      },
    }),
  ]);

  console.log(`✅ Created ${categories.length} categories`);

  // Create Organizations
  const organizations = await Promise.all([
    prisma.organization.upsert({
      where: { slug: 'global-relief-foundation' },
      update: {},
      create: {
        name: 'Global Relief Foundation',
        slug: 'global-relief-foundation',
        description: 'International organization dedicated to disaster relief and humanitarian aid worldwide.',
        walletAddress: '0x1234567890123456789012345678901234567890',
        websiteUrl: 'https://globalrelief.org',
        email: 'contact@globalrelief.org',
        country: 'Global',
        isVerified: true,
        verifiedAt: new Date(),
      },
    }),
    prisma.organization.upsert({
      where: { slug: 'medical-without-borders' },
      update: {},
      create: {
        name: 'Medical Without Borders',
        slug: 'medical-without-borders',
        description: 'Providing emergency medical care in crisis zones around the world.',
        walletAddress: '0x2345678901234567890123456789012345678901',
        websiteUrl: 'https://medicalwb.org',
        email: 'info@medicalwb.org',
        country: 'Global',
        isVerified: true,
        verifiedAt: new Date(),
      },
    }),
    prisma.organization.upsert({
      where: { slug: 'education-for-all' },
      update: {},
      create: {
        name: 'Education For All',
        slug: 'education-for-all',
        description: 'Building schools and providing educational resources in underserved communities.',
        walletAddress: '0x3456789012345678901234567890123456789012',
        websiteUrl: 'https://educationforall.org',
        email: 'hello@educationforall.org',
        country: 'Global',
        isVerified: false,
      },
    }),
  ]);

  console.log(`✅ Created ${organizations.length} organizations`);

  // Create sample campaigns
  const campaigns = await Promise.all([
    prisma.campaign.upsert({
      where: { onChainId: 'campaign-earthquake-jp-1' },
      update: {},
      create: {
        onChainId: 'campaign-earthquake-jp-1',
        title: 'Japan Earthquake Emergency Relief',
        description: 'Urgent support needed for earthquake victims in Japan. Funds will provide emergency shelter, food, and medical supplies to affected families.',
        categoryId: categories[0].id,
        organizationId: organizations[0].id,
        targetAmount: '100000000000000000000', // 100 ETH in wei
        currentAmount: '25000000000000000000', // 25 ETH
        donorCount: 150,
        sdsStreamId: 'luminex.earthquake-jp',
        status: 'ACTIVE',
        isVerified: true,
        isFeatured: true,
        startDate: new Date(),
      },
    }),
    prisma.campaign.upsert({
      where: { onChainId: 'campaign-flood-tr-1' },
      update: {},
      create: {
        onChainId: 'campaign-flood-tr-1',
        title: 'Turkey Flood Relief Fund',
        description: 'Help families displaced by severe flooding in Turkey. Your donation provides clean water, food, and temporary housing.',
        categoryId: categories[1].id,
        organizationId: organizations[0].id,
        targetAmount: '50000000000000000000', // 50 ETH
        currentAmount: '10000000000000000000', // 10 ETH
        donorCount: 85,
        sdsStreamId: 'luminex.flood-tr',
        status: 'ACTIVE',
        isVerified: true,
        isFeatured: true,
        startDate: new Date(),
      },
    }),
    prisma.campaign.upsert({
      where: { onChainId: 'campaign-medical-global-1' },
      update: {},
      create: {
        onChainId: 'campaign-medical-global-1',
        title: 'Global Medical Supply Initiative',
        description: 'Providing essential medical supplies and equipment to hospitals in crisis zones worldwide.',
        categoryId: categories[2].id,
        organizationId: organizations[1].id,
        targetAmount: '200000000000000000000', // 200 ETH
        currentAmount: '75000000000000000000', // 75 ETH
        donorCount: 320,
        sdsStreamId: 'luminex.medical-global',
        status: 'ACTIVE',
        isVerified: true,
        isFeatured: true,
        startDate: new Date(),
      },
    }),
  ]);

  console.log(`✅ Created ${campaigns.length} campaigns`);

  // Create Admin User
  const adminUser = await prisma.adminUser.upsert({
    where: { email: 'admin@luminex.io' },
    update: {},
    create: {
      email: 'admin@luminex.io',
      passwordHash: hashPassword('admin123'), // Change in production!
      firstName: 'Admin',
      lastName: 'User',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  console.log(`✅ Created admin user: ${adminUser.email}`);

  // Create sample donors
  const donors = await Promise.all([
    prisma.donor.upsert({
      where: { address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
      update: {},
      create: {
        address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        displayName: 'Generous Whale',
        totalDonated: '5000000000000000000', // 5 ETH
        donationCount: 10,
        campaignCount: 3,
        firstDonationAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        lastDonationAt: new Date(),
      },
    }),
    prisma.donor.upsert({
      where: { address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
      update: {},
      create: {
        address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        displayName: 'Anonymous Hero',
        totalDonated: '2500000000000000000', // 2.5 ETH
        donationCount: 5,
        campaignCount: 2,
        firstDonationAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        lastDonationAt: new Date(),
      },
    }),
  ]);

  console.log(`✅ Created ${donors.length} sample donors`);

  console.log('\n🎉 Database seeding complete!');
  console.log('\n📋 Login credentials:');
  console.log('   Email: admin@luminex.io');
  console.log('   Password: admin123');
  console.log('\n⚠️  Remember to change the admin password in production!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
