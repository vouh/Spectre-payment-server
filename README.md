# Spectre Tech Payment System

A modern M-Pesa payment integration system with real-time STK Push, Firebase backend, and admin dashboard.

## 🏗️ Project Structure

```
SPECTRE SECURE PAYMENT/
│
├── 📁 admin/                    # Admin Dashboard
│   ├── index.html              # Main dashboard (stats, transactions, exports)
│   └── login.html              # Admin authentication
│
├── 📁 firebase/                 # Firebase Integration (Single Source)
│   ├── config.js               # Firebase configuration & constants
│   └── client.js               # All Firebase services
│                               # - PaymentService (CRUD operations)
│                               # - StatsService (Dashboard stats)
│                               # - AuthService (Admin authentication)
│                               # - LogService (Transaction logging)
│
├── 📄 index.html               # Main Payment Page
│                               # - 3D Card UI with themes
│                               # - M-Pesa STK Push integration
│                               # - PDF receipt generation
│                               # - Styled error modals
│
├── 📄 coming-soon.html         # Company website placeholder
│
├── 📄 server.js                # Backend API (Vercel)
│                               # - /api/stkpush - Initiate payment
│                               # - /api/query - Check payment status
│                               # - /api/callback - M-Pesa callback handler
│                               # - /api/result/:id - Get transaction result
│                               # - Rate limiting & caching
│                               # - Production error handling
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

## 📱 M-Pesa Integration

### Production API URLs
```
OAuth Token: https://api.safaricom.co.ke/oauth/v1/generate
STK Push: https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest
STK Query: https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query
```

### Transaction Flow
1. User enters phone, amount, and reason
2. STK Push sent to customer's phone
3. Customer enters M-Pesa PIN
4. Callback received with `MpesaReceiptNumber`
5. Receipt displayed and PDF generated
6. Transaction saved to Firebase

### Error Handling
- **Wrong PIN** (Code 2001): User entered incorrect PIN
- **Insufficient Balance** (Code 1): Not enough funds
- **Cancelled** (Code 1032): User cancelled transaction
- **Timeout** (Code 1037): Request expired

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

## 👨‍💼 Admin Dashboard Features

- **Statistics**: Total, Completed, Failed, Revenue
- **Transaction Table**: Search, filter, sort
- **Export**: CSV and PDF reports
- **Actions**: View, delete transactions
- **Authentication**: Firebase Auth protected

## 📞 Contact

- **Email**: spectretechlimited@gmail.com
- **Phone**: 0741739262

---

© 2024 Spectre Tech Limited. All rights reserved.
