import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// In-memory store for transaction results (in production, use Redis/database)
const transactionResults = new Map();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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

// Get M-Pesa access token
async function getAccessToken() {
    const CONSUMER_KEY = process.env.CONSUMER_KEY;
    const CONSUMER_SECRET = process.env.CONSUMER_SECRET;
    
    const url = 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
    
    const response = await axios.get(url, {
        auth: { username: CONSUMER_KEY, password: CONSUMER_SECRET },
        headers: { 'Accept': 'application/json' }
    });
    
    return response.data.access_token;
}

// Health check
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Spectre Payment API is running',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Spectre Payment API is running',
        timestamp: new Date().toISOString()
    });
});

// STK Push endpoint
app.post('/api/stkpush', async (req, res) => {
    try {
        const { phoneNumber, amount, accountReference, transactionDesc } = req.body;

        if (!phoneNumber || !amount) {
            return res.status(400).json({ 
                success: false, 
                error: 'Phone number and amount are required' 
            });
        }

        // Format phone number
        const number = phoneNumber.replace(/^0/, '').replace(/^\+254/, '').replace(/^254/, '');
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
            'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            body,
            {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const stkResponse = response.data;
        console.log('STK Push Response:', stkResponse);

        if (stkResponse.ResponseCode === '0') {
            return res.json({
                success: true,
                message: 'STK Push sent successfully',
                checkoutRequestID: stkResponse.CheckoutRequestID,
                merchantRequestID: stkResponse.MerchantRequestID
            });
        } else {
            return res.status(400).json({
                success: false,
                error: stkResponse.ResponseDescription || 'STK Push failed'
            });
        }

    } catch (error) {
        console.error('STK Push Error:', error.response?.data || error.message);
        return res.status(500).json({
            success: false,
            error: error.response?.data?.errorMessage || error.message
        });
    }
});

// Query STK Push status
app.post('/api/query', async (req, res) => {
    try {
        const { checkoutRequestID } = req.body;

        if (!checkoutRequestID) {
            return res.status(400).json({ 
                success: false, 
                error: 'checkoutRequestID is required' 
            });
        }

        // First check if we have callback result stored
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
            'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query',
            body,
            {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const queryResponse = response.data;
        const resultCode = String(queryResponse.ResultCode);

        let status = 'pending';
        let message = queryResponse.ResultDesc;

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
