-- ========================================
-- Verify Transfer Functionality
-- Run this in Supabase SQL Editor
-- ========================================

-- 1. Check all users and their balances
SELECT 
  id,
  email,
  name,
  wallet_id,
  balance,
  status,
  created_at
FROM users
ORDER BY created_at DESC;

-- 2. Check recent transactions
SELECT 
  transaction_id,
  from_user_id,
  to_user_id,
  amount,
  type,
  status,
  description,
  note,
  created_at
FROM transactions
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check transactions with user details
SELECT 
  t.transaction_id,
  t.amount,
  t.type,
  t.status,
  t.description,
  sender.email as sender_email,
  sender.wallet_id as sender_wallet,
  sender.balance as sender_balance,
  recipient.email as recipient_email,
  recipient.wallet_id as recipient_wallet,
  recipient.balance as recipient_balance,
  t.created_at
FROM transactions t
LEFT JOIN users sender ON t.from_user_id = sender.id
LEFT JOIN users recipient ON t.to_user_id = recipient.id
ORDER BY t.created_at DESC
LIMIT 10;

-- 4. Check user balance history (for a specific user)
-- Replace 'your-email@example.com' with actual email
SELECT 
  u.email,
  u.wallet_id,
  u.balance as current_balance,
  (SELECT SUM(amount) FROM transactions WHERE to_user_id = u.id AND status = 'completed') as total_received,
  (SELECT SUM(amount) FROM transactions WHERE from_user_id = u.id AND status = 'completed') as total_sent
FROM users u
WHERE u.email = 'your-email@example.com';

-- 5. Verify balance calculation matches transactions
-- This should show if balances are correct
SELECT 
  u.email,
  u.wallet_id,
  u.balance as stored_balance,
  COALESCE((SELECT SUM(amount) FROM transactions WHERE to_user_id = u.id AND status = 'completed'), 0) -
  COALESCE((SELECT SUM(amount) FROM transactions WHERE from_user_id = u.id AND status = 'completed'), 0) as calculated_balance,
  u.balance - (
    COALESCE((SELECT SUM(amount) FROM transactions WHERE to_user_id = u.id AND status = 'completed'), 0) -
    COALESCE((SELECT SUM(amount) FROM transactions WHERE from_user_id = u.id AND status = 'completed'), 0)
  ) as difference
FROM users u
ORDER BY u.created_at DESC;

-- ========================================
-- Manual Transfer Test (if needed)
-- ========================================

-- Step 1: Get user IDs and current balances
SELECT id, email, wallet_id, balance FROM users WHERE email IN ('sender@example.com', 'recipient@example.com');

-- Step 2: Update balances manually (replace UUIDs)
-- Sender: Deduct amount
UPDATE users 
SET balance = balance - 100, updated_at = NOW()
WHERE id = 'sender-user-id-here';

-- Recipient: Add amount
UPDATE users 
SET balance = balance + 100, updated_at = NOW()
WHERE id = 'recipient-user-id-here';

-- Step 3: Create transaction record (replace UUIDs)
INSERT INTO transactions (
  transaction_id,
  from_user_id,
  to_user_id,
  amount,
  type,
  status,
  description
) VALUES (
  'TXN-MANUAL-TEST-001',
  'sender-user-id-here',
  'recipient-user-id-here',
  100,
  'transfer',
  'completed',
  'Manual test transfer'
);

-- Step 4: Verify the manual transfer
SELECT * FROM transactions WHERE transaction_id = 'TXN-MANUAL-TEST-001';
SELECT id, email, wallet_id, balance FROM users WHERE id IN ('sender-user-id-here', 'recipient-user-id-here');

-- ========================================
-- Reset Balances (if needed for testing)
-- ========================================

-- Give all users 1000 coins for testing
UPDATE users SET balance = 1000.00 WHERE role = 'user';

-- Clear all transactions
DELETE FROM transactions WHERE type = 'transfer';

-- Verify reset
SELECT email, wallet_id, balance FROM users ORDER BY created_at;
SELECT COUNT(*) as transaction_count FROM transactions;
