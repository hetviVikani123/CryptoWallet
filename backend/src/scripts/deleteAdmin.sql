-- Delete existing admin user
DELETE FROM users WHERE email = 'admin@gmail.com';

-- Verify deletion
SELECT * FROM users WHERE email = 'admin@gmail.com';
