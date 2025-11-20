-- ========================================
-- CryptoWallet Supabase Database Schema
-- ========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- USERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255), -- For custom auth (optional if using Supabase Auth)
  wallet_id VARCHAR(50) UNIQUE NOT NULL,
  balance DECIMAL(15, 2) DEFAULT 0.00 CHECK (balance >= 0),
  profile_picture TEXT,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'banned')),
  two_factor_enabled BOOLEAN DEFAULT false,
  biometric_enabled BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- OTP TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS otps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255),
  phone VARCHAR(20),
  otp VARCHAR(6) NOT NULL,
  type VARCHAR(20) DEFAULT 'email' CHECK (type IN ('email', 'sms')),
  purpose VARCHAR(50) NOT NULL CHECK (purpose IN ('registration', 'login', 'password_reset', '2fa')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- TRANSACTIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id VARCHAR(50) UNIQUE NOT NULL,
  from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  fee DECIMAL(15, 2) DEFAULT 0.00 CHECK (fee >= 0),
  total_amount DECIMAL(15, 2) GENERATED ALWAYS AS (amount + fee) STORED,
  type VARCHAR(20) CHECK (type IN ('transfer', 'deposit', 'withdrawal')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  description TEXT,
  note TEXT,
  metadata JSONB, -- For additional data (e.g., payment gateway info)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- COMPANIES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) UNIQUE NOT NULL,
  logo TEXT,
  description TEXT,
  website VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- SUPPORT TICKETS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- TICKET MESSAGES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  attachments JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- INDEXES
-- ========================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_wallet_id ON users(wallet_id);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- OTP indexes
CREATE INDEX IF NOT EXISTS idx_otps_email ON otps(email);
CREATE INDEX IF NOT EXISTS idx_otps_phone ON otps(phone);
CREATE INDEX IF NOT EXISTS idx_otps_user_id ON otps(user_id);
CREATE INDEX IF NOT EXISTS idx_otps_expires_at ON otps(expires_at);
CREATE INDEX IF NOT EXISTS idx_otps_purpose ON otps(purpose);

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_from_user ON transactions(from_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to_user ON transactions(to_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_id ON transactions(transaction_id);

-- Support tickets indexes
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_id ON support_tickets(ticket_id);

-- Ticket messages indexes
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_user_id ON ticket_messages(user_id);

-- ========================================
-- TRIGGERS
-- ========================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at 
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at 
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at 
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- CLEANUP EXPIRED OTPS
-- ========================================
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM otps WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Service role has full access to users" ON users
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (
    auth.uid()::text = from_user_id::text OR 
    auth.uid()::text = to_user_id::text
  );

CREATE POLICY "Service role has full access to transactions" ON transactions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- OTPs policies (service role only)
CREATE POLICY "Service role has full access to otps" ON otps
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Companies policies (public read)
CREATE POLICY "Anyone can view active companies" ON companies
  FOR SELECT USING (status = 'active');

CREATE POLICY "Service role has full access to companies" ON companies
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Support tickets policies
CREATE POLICY "Users can view own tickets" ON support_tickets
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create own tickets" ON support_tickets
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Service role has full access to tickets" ON support_tickets
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Ticket messages policies
CREATE POLICY "Users can view messages of own tickets" ON ticket_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM support_tickets 
      WHERE id = ticket_messages.ticket_id 
      AND user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Service role has full access to ticket messages" ON ticket_messages
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ========================================
-- SEED ADMIN USER (OPTIONAL)
-- ========================================
-- Run this after creating your first admin user via Supabase Auth
-- UPDATE users SET role = 'admin', status = 'active' WHERE email = 'admin@cryptowallet.com';

-- ========================================
-- FUNCTIONS FOR STATISTICS
-- ========================================

-- Get user dashboard stats
CREATE OR REPLACE FUNCTION get_user_dashboard_stats(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'balance', u.balance,
    'wallet_id', u.wallet_id,
    'total_sent', COALESCE(
      (SELECT SUM(amount) FROM transactions 
       WHERE from_user_id = user_uuid AND status = 'completed'), 0
    ),
    'total_received', COALESCE(
      (SELECT SUM(amount) FROM transactions 
       WHERE to_user_id = user_uuid AND status = 'completed'), 0
    ),
    'total_transactions', (
      SELECT COUNT(*) FROM transactions 
      WHERE (from_user_id = user_uuid OR to_user_id = user_uuid) 
      AND status = 'completed'
    )
  ) INTO result
  FROM users u
  WHERE u.id = user_uuid;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- COMMENTS
-- ========================================
COMMENT ON TABLE users IS 'User accounts and profiles';
COMMENT ON TABLE otps IS 'One-time passwords for verification';
COMMENT ON TABLE transactions IS 'Financial transactions between users';
COMMENT ON TABLE companies IS 'Partner companies for integrations';
COMMENT ON TABLE support_tickets IS 'User support tickets';
COMMENT ON TABLE ticket_messages IS 'Messages within support tickets';
