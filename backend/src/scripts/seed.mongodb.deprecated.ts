import mongoose from 'mongoose';
import { User, Company } from '../models';
import logger from '../utils/logger';
import dotenv from 'dotenv';

dotenv.config();

// Seed data
const seedAdmin = async () => {
  const adminExists = await User.findOne({ role: 'admin' });
  if (!adminExists) {
    await User.create({
      name: 'Admin',
      email: 'admin@cryptowallet.com',
      phone: '+1234567890',
      password: 'Admin@123',
      walletId: 'CWADMIN001',
      balance: 0,
      role: 'admin',
      status: 'active',
      emailVerified: true,
      phoneVerified: true,
    });
    logger.info('Admin user created');
  }
};

const seedCompanies = async () => {
  const companiesExist = await Company.countDocuments();
  if (companiesExist === 0) {
    const companies = [
      {
        name: 'Bitcoin',
        description: 'The first decentralized cryptocurrency',
        logo: '₿',
        category: 'Cryptocurrency',
        rating: 4.8,
        coinValue: 43520.45,
        change24h: 2.34,
        marketCap: '$850B',
        chartData: [
          { time: '00:00', value: 42500 },
          { time: '04:00', value: 42800 },
          { time: '08:00', value: 43100 },
          { time: '12:00', value: 43300 },
          { time: '16:00', value: 43400 },
          { time: '20:00', value: 43520 },
        ],
      },
      {
        name: 'Ethereum',
        description: 'Decentralized platform for smart contracts',
        logo: 'Ξ',
        category: 'Cryptocurrency',
        rating: 4.7,
        coinValue: 2280.32,
        change24h: 1.85,
        marketCap: '$275B',
        chartData: [
          { time: '00:00', value: 2240 },
          { time: '04:00', value: 2250 },
          { time: '08:00', value: 2260 },
          { time: '12:00', value: 2270 },
          { time: '16:00', value: 2275 },
          { time: '20:00', value: 2280 },
        ],
      },
      {
        name: 'Binance Coin',
        description: 'Native token of the Binance exchange',
        logo: 'BNB',
        category: 'Cryptocurrency',
        rating: 4.5,
        coinValue: 315.75,
        change24h: 3.12,
        marketCap: '$48B',
        chartData: [
          { time: '00:00', value: 306 },
          { time: '04:00', value: 308 },
          { time: '08:00', value: 310 },
          { time: '12:00', value: 312 },
          { time: '16:00', value: 314 },
          { time: '20:00', value: 315.75 },
        ],
      },
      {
        name: 'Cardano',
        description: 'Blockchain platform for smart contracts',
        logo: 'ADA',
        category: 'Cryptocurrency',
        rating: 4.3,
        coinValue: 0.485,
        change24h: -1.24,
        marketCap: '$17B',
        chartData: [
          { time: '00:00', value: 0.491 },
          { time: '04:00', value: 0.489 },
          { time: '08:00', value: 0.488 },
          { time: '12:00', value: 0.487 },
          { time: '16:00', value: 0.486 },
          { time: '20:00', value: 0.485 },
        ],
      },
      {
        name: 'Solana',
        description: 'High-performance blockchain',
        logo: 'SOL',
        category: 'Cryptocurrency',
        rating: 4.6,
        coinValue: 98.45,
        change24h: 5.67,
        marketCap: '$42B',
        chartData: [
          { time: '00:00', value: 93.2 },
          { time: '04:00', value: 94.5 },
          { time: '08:00', value: 95.8 },
          { time: '12:00', value: 96.9 },
          { time: '16:00', value: 97.7 },
          { time: '20:00', value: 98.45 },
        ],
      },
    ];

    await Company.insertMany(companies);
    logger.info('Companies seeded');
  }
};

const seedDatabase = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cryptowallet');
    logger.info('Database connected for seeding');

    // Seed data
    await seedAdmin();
    await seedCompanies();

    logger.info('Database seeding completed');
    process.exit(0);
  } catch (error) {
    logger.error('Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();
