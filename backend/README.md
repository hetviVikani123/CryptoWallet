# Crypto Wallet Backend API

Production-ready Express.js backend API with TypeScript, MongoDB, Firebase Auth, and comprehensive security features.

## 🚀 Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.x
- **Language**: TypeScript 5.x
- **Database**: MongoDB (Mongoose ORM)
- **Authentication**: Firebase Admin SDK + JWT
- **SMS OTP**: Twilio
- **Email**: Nodemailer
- **Caching/Sessions**: Redis
- **File Storage**: Cloudinary
- **Logging**: Winston
- **Testing**: Jest + Supertest
- **Security**: Helmet, CORS, Rate Limiting

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   │   ├── database.ts
│   │   ├── firebase.ts
│   │   ├── redis.ts
│   │   └── cloudinary.ts
│   ├── models/          # Mongoose models
│   │   ├── User.model.ts
│   │   ├── Transaction.model.ts
│   │   ├── Wallet.model.ts
│   │   └── Company.model.ts
│   ├── controllers/     # Route controllers
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── wallet.controller.ts
│   │   ├── transaction.controller.ts
│   │   └── admin.controller.ts
│   ├── routes/          # API routes
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── wallet.routes.ts
│   │   ├── transaction.routes.ts
│   │   └── admin.routes.ts
│   ├── middleware/      # Custom middleware
│   │   ├── auth.middleware.ts
│   │   ├── errorHandler.ts
│   │   ├── rateLimiter.ts
│   │   └── validator.ts
│   ├── services/        # Business logic
│   │   ├── auth.service.ts
│   │   ├── wallet.service.ts
│   │   ├── transaction.service.ts
│   │   ├── email.service.ts
│   │   └── sms.service.ts
│   ├── utils/           # Utility functions
│   │   ├── logger.ts
│   │   ├── helpers.ts
│   │   └── validators.ts
│   └── server.ts        # Main server file
├── tests/               # Test files
│   ├── auth.test.ts
│   ├── wallet.test.ts
│   └── transaction.test.ts
├── logs/                # Log files
├── .env.example         # Environment variables template
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## 🛠️ Installation

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

### 3. Required Services Setup

#### MongoDB
- Local: Install MongoDB or use Docker
- Cloud: Create MongoDB Atlas cluster
- Update `MONGODB_URI` in `.env`

#### Redis (Optional but recommended)
```bash
# Using Docker
docker run -d --name redis -p 6379:6379 redis:alpine

# Or install locally
# Windows: https://github.com/tporadowski/redis/releases
# Mac: brew install redis
# Linux: sudo apt-get install redis-server
```

#### Firebase Admin SDK
1. Go to Firebase Console
2. Project Settings → Service Accounts
3. Generate new private key
4. Add credentials to `.env`

#### Twilio (for SMS)
1. Sign up at twilio.com
2. Get Account SID and Auth Token
3. Purchase a phone number
4. Add to `.env`

## 🚀 Running the Server

### Development Mode
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Running Tests
```bash
npm test
```

## 📡 API Endpoints

### Authentication (`/api/auth`)
```
POST   /register          - Register new user
POST   /login             - Login user
POST   /refresh           - Refresh access token
POST   /logout            - Logout user
POST   /verify-otp        - Verify OTP
POST   /resend-otp        - Resend OTP
POST   /forgot-password   - Request password reset
POST   /reset-password    - Reset password with OTP
```

### Users (`/api/users`)
```
GET    /profile           - Get user profile
PUT    /profile           - Update user profile
PUT    /change-password   - Change password
POST   /upload-avatar     - Upload profile picture
```

### Wallet (`/api/wallet`)
```
GET    /balance           - Get wallet balance
GET    /details           - Get wallet details
POST   /generate-qr       - Generate QR code for wallet
```

### Transactions (`/api/transactions`)
```
POST   /transfer          - Transfer coins
GET    /history           - Get transaction history
GET    /:id               - Get transaction details
POST   /verify-pin        - Verify transaction PIN
GET    /export            - Export transactions to CSV
```

### Admin (`/api/admin`)
```
POST   /login             - Admin login
GET    /users             - Get all users
GET    /users/:id         - Get user details
PUT    /users/:id/status  - Update user status
GET    /transactions      - Get all transactions
GET    /analytics         - Get platform analytics
POST   /broadcast-email   - Send broadcast email
PUT    /coin-rate         - Update coin rate
```

## 🔒 Security Features

### Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-based access control (User, Admin)
- Firebase Auth integration
- Redis-based session management

### Security Middleware
- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Prevent brute force attacks
- **Input Validation**: Express-validator

### Password Security
- Bcrypt hashing with salt rounds
- Minimum password requirements
- Password reset with OTP verification

### Transaction Security
- PIN verification for transfers
- Atomic database operations
- Transaction status tracking
- Balance validation

## 📊 Database Models

### User Model
```typescript
{
  name: string
  email: string (unique)
  phone: string (unique)
  password: string (hashed)
  walletId: string (unique)
  balance: number
  profilePicture?: string
  role: 'user' | 'admin'
  status: 'active' | 'suspended' | 'pending'
  twoFactorEnabled: boolean
  createdAt: Date
  updatedAt: Date
}
```

### Transaction Model
```typescript
{
  from: ObjectId (User)
  to: ObjectId (User)
  amount: number
  type: 'sent' | 'received'
  status: 'pending' | 'completed' | 'failed'
  note?: string
  transactionId: string (unique)
  createdAt: Date
}
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test auth.test.ts
```

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 5000) |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | JWT secret key | Yes |
| `FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | Yes |
| `EMAIL_USER` | Email service user | Yes |
| `REDIS_HOST` | Redis host | No |

## 🚢 Deployment

### Using Docker
```bash
# Build image
docker build -t cryptowallet-backend .

# Run container
docker run -p 5000:5000 --env-file .env cryptowallet-backend
```

### Deploy to Render
1. Connect GitHub repository
2. Select Node.js environment
3. Set build command: `npm install && npm run build`
4. Set start command: `npm start`
5. Add environment variables

### Deploy to Railway
1. Connect repository
2. Add environment variables
3. Deploy automatically

## 📈 Monitoring & Logs

- Winston logger with file and console transports
- Error logs: `logs/error.log`
- Combined logs: `logs/combined.log`
- Request logging with Morgan

## 🔧 Development Tools

```bash
# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run type-check
```

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

## 👥 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Support

For support, email support@cryptowallet.com or join our Slack channel.
