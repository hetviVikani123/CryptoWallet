import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

import { supabase } from '../config/supabase';
import logger from '../utils/logger';

async function clearSupportTickets() {
  try {
    logger.info('Deleting all support tickets...');

    const { error } = await supabase
      .from('support_tickets')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (error) {
      throw new Error(`Failed to delete support tickets: ${error.message}`);
    }

    logger.info('✅ All support tickets deleted successfully!');
    logger.info('Now users can create their own support tickets dynamically.');
    process.exit(0);
  } catch (error) {
    logger.error('Error clearing support tickets:', error);
    process.exit(1);
  }
}

// Run the clear function
clearSupportTickets();
