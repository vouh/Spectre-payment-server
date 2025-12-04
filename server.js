import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// ==========================================
// PRODUCTION CONFIGURATION
// ==========================================

// M-Pesa Production API URLs
const MPESA_URLS = {
    oauth: 'https://api.safaricom.co.ke/oauth/v1/generate',
    stkPush: 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
    stkQuery: 'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query',
    transactionStatus: 'https://api.safaricom.co.ke/mpesa/transactionstatus/v1/query',
    accountBalance: 'https://api.safaricom.co.ke/mpesa/accountbalance/v1/query',
    reversal: 'https://api.safaricom.co.ke/mpesa/reversal/v1/request'
};

// In-memory store for transaction results (use Redis in production for scaling)
const transactionResults = new Map();

// Token cache to reduce OAuth calls
let tokenCache = { token: null, expiry: 0 };

// Rate limiting - simple in-memory (use Redis in production)
const rateLimiter = new Map();
const RATE_LIMIT = 10; // requests per minute per IP
const RATE_WINDOW = 60000; // 1 minute

// ==========================================
// MIDDLEWARE
// ==========================================

// CORS with specific origins for security
app.use(cors({
    origin: [
        'https://spectre-tech.netlify.app',
        'http://localhost:3000',
        'http://127.0.0.1:5500',
        'http://localhost:5500'
    ],
    methods: ['GET', 'POST'],
    credentials: true
}));

// Body parsing with size limits
app.use(bodyParser.json({ limit: '10kb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10kb' }));

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Simple rate limiter middleware
const checkRateLimit = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!rateLimiter.has(ip)) {
        rateLimiter.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
        return next();
    }
    
    const limiter = rateLimiter.get(ip);
    
    if (now > limiter.resetTime) {
        limiter.count = 1;
        limiter.resetTime = now + RATE_WINDOW;
        return next();
    }
    
    if (limiter.count >= RATE_LIMIT) {
        return res.status(429).json({
            success: false,
            error: 'Too many requests. Please wait a moment and try again.'
        });
    }
    
    limiter.count++;
    next();
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

// Get timestamp in format YYYYMMDDHHmmss
function getTimeStamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

// Get M-Pesa access token with caching
async function getAccessToken() {
    const now = Date.now();
    
    // Return cached token if still valid (with 60s buffer)
    if (tokenCache.token && tokenCache.expiry > now + 60000) {
        return tokenCache.token;
    }
    
    const CONSUMER_KEY = process.env.CONSUMER_KEY;
    const CONSUMER_SECRET = process.env.CONSUMER_SECRET;
    
    const response = await axios.get(`${MPESA_URLS.oauth}?grant_type=client_credentials`, {
        auth: { username: CONSUMER_KEY, password: CONSUMER_SECRET },
        headers: { 'Accept': 'application/json' },
        timeout: 30000 // 30 second timeout
    });
    
    // Cache token (M-Pesa tokens typically expire in 1 hour)
    tokenCache = {
        token: response.data.access_token,
        expiry: now + (response.data.expires_in * 1000) - 60000
    };
    
    return tokenCache.token;
}

// Error response helper
function errorResponse(res, statusCode, message, details = null) {
    return res.status(statusCode).json({
        success: false,
        error: message,
        details: details,
        timestamp: new Date().toISOString()
    });
}

// ==========================================
// ROUTES
// ==========================================

// Health check
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Spectre Payment API is running',
        version: '1.0.0',
        environment: 'production',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Spectre Payment API is running',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// STK Push endpoint with rate limiting
app.post('/api/stkpush', checkRateLimit, async (req, res) => {
    try {
        const { phoneNumber, amount, accountReference, transactionDesc } = req.body;

        // Validation
        if (!phoneNumber || !amount) {
            return errorResponse(res, 400, 'Phone number and amount are required');
        }

        const numAmount = parseInt(amount);
        if (isNaN(numAmount) || numAmount < 1 || numAmount > 150000) {
            return errorResponse(res, 400, 'Amount must be between 1 and 150,000 KES');
        }

        // Format phone number
        const number = phoneNumber.replace(/^0/, '').replace(/^\+254/, '').replace(/^254/, '');
        if (!/^7\d{8}$/.test(number) && !/^1\d{8}$/.test(number)) {
            return errorResponse(res, 400, 'Invalid phone number format');
        }
        const formattedPhone = `254${number}`;

        // Get access token
        const access_token = await getAccessToken();

        // Get credentials
        const BusinessShortCode = process.env.BusinessShortCode;
        const MPESA_PASSKEY = process.env.MPESA_PASSKEY;
        const TILL_NUMBER = process.env.TILL_NUMBER;

        // Generate timestamp and password
        const timestamp = getTimeStamp();
        const password = Buffer.from(`${BusinessShortCode}${MPESA_PASSKEY}${timestamp}`).toString('base64');

        // Callback URL
        const domain = process.env.DOMAIN || 'https://spectre-payment-server.vercel.app';

        // Sanitize inputs - M-Pesa only accepts alphanumeric
        const cleanAccountRef = (accountReference || 'SpectreTech').replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
        const cleanTransDesc = (transactionDesc || 'Payment').replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 20);

        const body = {
            BusinessShortCode: BusinessShortCode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerBuyGoodsOnline",
            Amount: String(amount),
            PartyA: formattedPhone,
            PartyB: TILL_NUMBER,
            PhoneNumber: formattedPhone,
            CallBackURL: `${domain}/api/callback`,
            AccountReference: cleanAccountRef,
            TransactionDesc: cleanTransDesc
        };

        console.log('STK Push Request:', { ...body, Password: '[HIDDEN]' });

        const response = await axios.post(
            MPESA_URLS.stkPush,
            body,
            {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30 second timeout
            }
        );

        const stkResponse = response.data;
        console.log('STK Push Response:', stkResponse);

        if (stkResponse.ResponseCode === '0') {
            return res.json({
                success: true,
                message: 'STK Push sent successfully',
                checkoutRequestID: stkResponse.CheckoutRequestID,
                merchantRequestID: stkResponse.MerchantRequestID,
                timestamp: new Date().toISOString()
            });
        } else {
            return errorResponse(res, 400, stkResponse.ResponseDescription || 'STK Push failed');
        }

    } catch (error) {
        console.error('STK Push Error:', error.response?.data || error.message);
        
        // Handle specific M-Pesa errors
        const mpesaError = error.response?.data?.errorMessage;
        if (mpesaError) {
            return errorResponse(res, 400, mpesaError);
        }
        
        // Handle timeout
        if (error.code === 'ECONNABORTED') {
            return errorResponse(res, 504, 'Request timeout. Please try again.');
        }
        
        return errorResponse(res, 500, 'Payment service temporarily unavailable');
    }
});

// Query STK Push status
app.post('/api/query', async (req, res) => {
    try {
        const { checkoutRequestID } = req.body;

        if (!checkoutRequestID) {
            return errorResponse(res, 400, 'checkoutRequestID is required');
        }

        // First check if we have callback result stored (faster response)
        const storedResult = transactionResults.get(checkoutRequestID);
        if (storedResult) {
            return res.json({
                success: true,
                status: storedResult.success ? 'success' : 'failed',
                resultCode: String(storedResult.resultCode),
                message: storedResult.resultDesc,
                mpesaReceiptNumber: storedResult.mpesaReceiptNumber || null,
                amount: storedResult.amount || null,
                phoneNumber: storedResult.phoneNumber || null,
                transactionDate: storedResult.transactionDate || null
            });
        }

        const access_token = await getAccessToken();

        const BusinessShortCode = process.env.BusinessShortCode;
        const MPESA_PASSKEY = process.env.MPESA_PASSKEY;

        const timestamp = getTimeStamp();
        const password = Buffer.from(`${BusinessShortCode}${MPESA_PASSKEY}${timestamp}`).toString('base64');

        const body = {
            BusinessShortCode: BusinessShortCode,
            Password: password,
            Timestamp: timestamp,
            CheckoutRequestID: checkoutRequestID
        };

        const response = await axios.post(
            MPESA_URLS.stkQuery,
            body,
            {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        const queryResponse = response.data;
        const resultCode = String(queryResponse.ResultCode);

        let status = 'pending';
        let message = queryResponse.ResultDesc;

        // M-Pesa Result Codes
        if (resultCode === '0') {
            status = 'success';
            message = 'Payment completed successfully';
        } else if (resultCode === '1032') {
            status = 'cancelled';
            message = 'Transaction cancelled by user';
        } else if (resultCode === '1') {
            status = 'failed';
            message = 'Insufficient balance';
        } else if (resultCode === '1037') {
            status = 'timeout';
            message = 'Transaction timed out';
        } else if (resultCode === '2001') {
            status = 'failed';
            message = 'Wrong PIN entered';
        } else if (resultCode === '1025') {
            status = 'failed';
            message = 'Transaction limit exceeded';
        }

        // Check stored result again (callback might have come during query)
        const latestResult = transactionResults.get(checkoutRequestID);

        return res.json({
            success: true,
            status: status,
            resultCode: resultCode,
            message: message,
            mpesaReceiptNumber: latestResult?.mpesaReceiptNumber || null,
            amount: latestResult?.amount || null,
            phoneNumber: latestResult?.phoneNumber || null
        });

    } catch (error) {
        console.error('Query Error:', error.response?.data || error.message);
        
        return res.json({
            success: true,
            status: 'pending',
            message: 'Checking payment status...'
        });
    }
});

// M-Pesa Callback - Extract receipt number and store result
app.post('/api/callback', (req, res) => {
    console.log('📥 M-Pesa Callback Received:', JSON.stringify(req.body, null, 2));
    
    try {
        const stkCallback = req.body?.Body?.stkCallback;
        
        if (!stkCallback) {
            console.log('⚠️ Invalid callback structure');
            return res.json({ ResultCode: 0, ResultDesc: 'Callback received' });
        }

        const checkoutRequestID = stkCallback.CheckoutRequestID;
        const resultCode = stkCallback.ResultCode;
        const resultDesc = stkCallback.ResultDesc;

        // Parse callback data
        const callbackResult = {
            checkoutRequestID,
            merchantRequestID: stkCallback.MerchantRequestID,
            resultCode,
            resultDesc,
            success: resultCode === 0,
            timestamp: new Date().toISOString()
        };

        // If successful, extract metadata (including MpesaReceiptNumber)
        if (resultCode === 0 && stkCallback.CallbackMetadata?.Item) {
            const metadata = {};
            stkCallback.CallbackMetadata.Item.forEach(item => {
                metadata[item.Name] = item.Value;
            });
            
            callbackResult.mpesaReceiptNumber = metadata.MpesaReceiptNumber;
            callbackResult.amount = metadata.Amount;
            callbackResult.transactionDate = metadata.TransactionDate;
            callbackResult.phoneNumber = metadata.PhoneNumber;
            
            console.log('✅ Payment Successful!');
            console.log('📄 M-Pesa Receipt Number:', metadata.MpesaReceiptNumber);
        } else {
            console.log('❌ Payment Failed:', resultDesc);
        }

        // Store result for polling
        transactionResults.set(checkoutRequestID, callbackResult);
        
        // Auto-cleanup after 10 minutes
        setTimeout(() => {
            transactionResults.delete(checkoutRequestID);
        }, 10 * 60 * 1000);

        res.json({ ResultCode: 0, ResultDesc: 'Callback processed successfully' });
    } catch (error) {
        console.error('Callback processing error:', error);
        res.json({ ResultCode: 0, ResultDesc: 'Callback received' });
    }
});

// Get transaction result by checkoutRequestID (for frontend polling)
app.get('/api/result/:checkoutRequestID', (req, res) => {
    const { checkoutRequestID } = req.params;
    const result = transactionResults.get(checkoutRequestID);
    
    if (result) {
        res.json({
            success: true,
            found: true,
            data: result
        });
    } else {
        res.json({
            success: true,
            found: false,
            message: 'Transaction result not yet available'
        });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// Export for Vercel
export default app;
