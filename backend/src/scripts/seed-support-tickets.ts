import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

import { supabase } from '../config/supabase';
import logger from '../utils/logger';

async function seedSupportTickets() {
  try {
    logger.info('Starting to seed support tickets...');

    // First, get the existing users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name')
      .limit(2);

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    if (!users || users.length === 0) {
      throw new Error('No users found in database. Please seed users first.');
    }

    logger.info(`Found ${users.length} users`);

    // Sample support tickets
    const supportTickets = [
      {
        ticket_id: `TICKET-${Date.now()}-001`,
        user_id: users[0].id,
        subject: 'Unable to withdraw funds',
        description: 'I am trying to withdraw $500 to my bank account but the transaction keeps failing. Please help!',
        status: 'open',
        priority: 'high',
      },
      {
        ticket_id: `TICKET-${Date.now()}-002`,
        user_id: users[0].id,
        subject: 'Transaction not reflected in wallet',
        description: 'I sent 0.5 BTC to my wallet 2 hours ago but it is still not showing up. Transaction ID: xyz123abc',
        status: 'in_progress',
        priority: 'high',
      },
      {
        ticket_id: `TICKET-${Date.now()}-003`,
        user_id: users[1] ? users[1].id : users[0].id,
        subject: 'How to enable 2FA?',
        description: 'I want to enable two-factor authentication for my account. Can you guide me through the process?',
        status: 'open',
        priority: 'medium',
      },
      {
        ticket_id: `TICKET-${Date.now()}-004`,
        user_id: users[1] ? users[1].id : users[0].id,
        subject: 'Question about transaction fees',
        description: 'What are the fees for international transfers? I need to send money to Europe.',
        status: 'resolved',
        priority: 'low',
      },
      {
        ticket_id: `TICKET-${Date.now()}-005`,
        user_id: users[0].id,
        subject: 'Account verification pending',
        description: 'I submitted my KYC documents 3 days ago but my account is still pending verification.',
        status: 'in_progress',
        priority: 'medium',
      },
      {
        ticket_id: `TICKET-${Date.now()}-006`,
        user_id: users[1] ? users[1].id : users[0].id,
        subject: 'Login issues from mobile app',
        description: 'I cannot login to the mobile app. It says "invalid credentials" but my password is correct.',
        status: 'open',
        priority: 'high',
      },
      {
        ticket_id: `TICKET-${Date.now()}-007`,
        user_id: users[0].id,
        subject: 'Request for transaction history export',
        description: 'Can I get a CSV export of my transaction history for the last 6 months? I need it for tax purposes.',
        status: 'resolved',
        priority: 'low',
      },
      {
        ticket_id: `TICKET-${Date.now()}-008`,
        user_id: users[1] ? users[1].id : users[0].id,
        subject: 'Suspicious activity on my account',
        description: 'I noticed some transactions that I did not make. Please check my account urgently!',
        status: 'open',
        priority: 'urgent',
      },
    ];

    // Insert support tickets
    const { data: insertedTickets, error: insertError } = await supabase
      .from('support_tickets')
      .insert(supportTickets)
      .select();

    if (insertError) {
      throw new Error(`Failed to insert support tickets: ${insertError.message}`);
    }

    logger.info(`✅ Successfully inserted ${insertedTickets?.length || 0} support tickets`);

    // Display the created tickets
    console.log('\n=== Created Support Tickets ===\n');
    insertedTickets?.forEach((ticket, index) => {
      console.log(`${index + 1}. [${ticket.priority.toUpperCase()}] ${ticket.subject}`);
      console.log(`   Status: ${ticket.status}`);
      console.log(`   User: ${users.find(u => u.id === ticket.user_id)?.email || 'Unknown'}`);
      console.log('');
    });

    logger.info('✅ Support tickets seeding completed!');
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding support tickets:', error);
    process.exit(1);
  }
}

// Run the seed function
seedSupportTickets();
