import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

import supabase from '../config/supabase';
import bcrypt from 'bcryptjs';

async function createAdminUser() {
  try {
    const email = 'admin@gmail.com';
    const password = 'Admin@123';
    const name = 'Admin User';
    const phone = '+919999999999';
    const adminWalletId = 'ADMIN-PANEL'; // Special wallet ID for admin (not used for transactions)

    // Check if admin already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', email)
      .single();

    if (existing) {
      // Delete existing admin to recreate without wallet
      console.log('� Deleting existing admin to recreate without wallet...');
      await supabase
        .from('users')
        .delete()
        .eq('email', email);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin user (special wallet ID, but 0 balance - admin cannot transact)
    const { data: admin, error } = await supabase
      .from('users')
      .insert({
        name,
        email,
        phone,
        password_hash: passwordHash,
        wallet_id: adminWalletId, // Special admin wallet (not for transactions)
        balance: 0, // Admin has no balance - cannot send/receive coins
        status: 'active',
        role: 'admin',
        email_verified: true,
        phone_verified: true,
        two_factor_enabled: false,
        biometric_enabled: false,
      })
      .select()
      .single();

    if (error || !admin) {
      console.error('❌ Failed to create admin user:', error);
      return;
    }

    console.log('\n=================================');
    console.log('✅ ADMIN USER CREATED SUCCESSFULLY');
    console.log('=================================');
    console.log(`📧 Email: ${email}`);
    console.log(`🔐 Password: ${password}`);
    console.log(`👤 Name: ${name}`);
    console.log(`👑 Role: ADMIN (Dashboard Access Only)`);
    console.log(`⚠️  Note: Admin cannot send/receive coins`);
    console.log(`🆔 Wallet ID: ${adminWalletId} (System ID - Not for transactions)`);
    console.log('=================================\n');
    console.log('ADMIN LOGIN INSTRUCTIONS:');
    console.log('1. Go to: http://localhost:3001/auth/login');
    console.log('2. Login with admin@gmail.com / Admin@123');
    console.log('3. Complete OTP verification (check backend console)');
    console.log('4. After login, navigate to: /admin/dashboard');
    console.log('5. Manage users, approve deposits/withdrawals');
    console.log('\n');

  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    process.exit(0);
  }
}

createAdminUser();
