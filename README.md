# Spectre Tech Payment System

A modern M-Pesa payment integration system with real-time STK Push, Firebase backend, and admin dashboard.

## 🏗️ Project Structure

```
SPECTRE SECURE PAYMENT/
│
├── 📁 admin/                    # Admin Dashboard
│   ├── index.html              # Main dashboard (stats, transactions, exports)
│   ├── failed.html             # Failed transactions analysis page
│   └── login.html              # Admin authentication
│
├── 📁 firebase/                 # Firebase Integration
│   ├── config.js               # Firebase configuration & constants
│   └── client.js               # Firebase services
│                               # - PaymentService (CRUD operations)
│                               # - StatsService (Dashboard stats)
│                               # - AuthService (Admin authentication)
│                               # - LogService (Transaction logging)
│
├── 📄 index.html               # Main Payment Page
│                               # - 3D Card UI with themes
│                               # - M-Pesa STK Push integration
│                               # - PDF receipt generation
│                               # - Custom error modals
│                               # - Amount limit (max 9999)
│
├── 📄 coming-soon.html         # Company website placeholder
│
├── 📄 server.js                # Backend API (Vercel Serverless)
│                               # - /api/stkpush - Initiate payment
│                               # - /api/query - Check payment status
│                               # - /api/callback - M-Pesa callback handler
│                               # - /api/result/:id - Get transaction result
│                               # - Rate limiting & caching
│
├── 📄 vercel.json              # Vercel deployment configuration
├── 📄 package.json             # Node.js dependencies
├── 📄 .gitignore               # Git ignore rules
│
├── 🖼️ logo.jpg                 # Company logo
└── 🖼️ logo-no-bg.png           # Logo (transparent)
```

## 🚀 Live URLs

| Service | URL |
|---------|-----|
| Payment Page | https://spectre-tech.netlify.app |
| Admin Dashboard | https://spectre-tech.netlify.app/admin |
| API Server | https://spectre-payment-server.vercel.app |

## 🔧 Technologies

- **Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript
- **Backend**: Node.js, Express.js (Vercel Serverless)
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Payment**: Safaricom M-Pesa Daraja API (Production)
- **PDF**: jsPDF

## 👨‍💼 Admin Dashboard Features

### Main Dashboard (`admin/index.html`)
- **Statistics Cards**: Total, Completed, Failed, Revenue
- **Transaction Table**: Search, filter by status/date, sort
- **Export Options**: CSV and PDF reports
- **Actions**: View details, delete transactions
- **Theme Toggle**: Dark/Light mode with persistence
- **Mobile Optimized**: Hamburger menu, responsive grid
- **Custom Modals**: Styled confirmation dialogs (no browser prompts)

### Failed Transactions (`admin/failed.html`)
- **Error Breakdown**: Wrong PIN, Insufficient Funds, Cancelled, Timeout, Other
- **Detailed Stats**: Count per error type
- **Filter & Search**: By error type, date range
- **Export**: CSV and PDF reports

### Authentication (`admin/login.html`)
- Firebase Auth protected
- Email/password login
- Session persistence

## 📱 M-Pesa Integration

### Production API URLs
```
OAuth Token: https://api.safaricom.co.ke/oauth/v1/generate
STK Push: https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest
STK Query: https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query
```

### Transaction Flow
1. User enters phone, amount (max 9999), and reason
2. STK Push sent to customer's phone
3. Customer enters M-Pesa PIN
4. Callback received with `MpesaReceiptNumber`
5. Receipt displayed and PDF generated
6. Transaction saved to Firebase

### Error Handling
| Code | Error | Description |
|------|-------|-------------|
| 2001 | Wrong PIN | User entered incorrect M-Pesa PIN |
| 1 | Insufficient Balance | Not enough funds in account |
| 1032 | Cancelled | User cancelled the transaction |
| 1037 | Timeout | Request expired (no response) |

### API Endpoints

```
POST /api/stkpush
Body: { phoneNumber, amount, accountReference, transactionDesc }

POST /api/query
Body: { checkoutRequestID }

POST /api/callback
(Called by M-Pesa)

GET /api/result/:checkoutRequestID
```

## 🔐 Environment Variables (Vercel)

```env
CONSUMER_KEY=your_daraja_consumer_key
CONSUMER_SECRET=your_daraja_consumer_secret
BusinessShortCode=your_shortcode
MPESA_PASSKEY=your_passkey
TILL_NUMBER=your_till_number
DOMAIN=https://spectre-payment-server.vercel.app
```

## 🛡️ Security Features

- Rate limiting (10 requests/minute per IP)
- OAuth token caching
- Input validation & sanitization
- CORS restriction to allowed origins
- Request timeouts (30s)
- Firebase Auth for admin access

## 📞 Support

- **Email**: spectretechlimited@gmail.com
- **Phone**: 0741739262

---

© 2025 Spectre Tech Limited. All rights reserved.
