import supabase from '../config/supabase';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Generate wallet ID
const generateWalletId = (): string => {
  const prefix = 'CW';
  const random = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `${prefix}${random}`;
};

async function createAdminUser() {
  try {
    console.log('🔍 Checking for existing admin user...');
    
    // Check if admin already exists
    const { data: existingAdmin } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'admin')
      .single();

    if (existingAdmin) {
      console.log('✅ Admin user already exists:');
      console.log('   Email:', existingAdmin.email);
      console.log('   Name:', existingAdmin.name);
      console.log('   Wallet ID:', existingAdmin.wallet_id);
      console.log('   Status:', existingAdmin.status);
      return;
    }

    console.log('📝 No admin user found. Creating one...');

    // Generate unique wallet ID
    let walletId = generateWalletId();
    let walletExists = true;
    
    while (walletExists) {
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_id', walletId)
        .single();
      
      if (!data) walletExists = false;
      else walletId = generateWalletId();
    }

    // Hash password
    const password = 'admin123456';
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin user
    const { data: admin, error } = await supabase
      .from('users')
      .insert({
        name: 'System Administrator',
        email: 'admin@cryptowallet.com',
        phone: '+1234567890',
        password_hash: passwordHash,
        wallet_id: walletId,
        balance: 0,
        status: 'active',
        role: 'admin',
        two_factor_enabled: false,
        biometric_enabled: false,
        email_verified: true,
        phone_verified: true,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating admin user:', error);
      return;
    }

    console.log('\n✅ Admin user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:    admin@cryptowallet.com');
    console.log('🔐 Password: admin123456');
    console.log('👤 Name:     System Administrator');
    console.log('💳 Wallet:   ' + admin.wallet_id);
    console.log('🎭 Role:     admin');
    console.log('✅ Status:   active');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🚀 You can now login as admin at: http://localhost:3001/auth/login');
    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createAdminUser();
