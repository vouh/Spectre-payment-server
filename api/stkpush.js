const axios = require('axios');

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

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { phoneNumber, amount, accountReference, transactionDesc } = req.body;

        if (!phoneNumber || !amount) {
            return res.status(400).json({ success: false, error: 'Phone number and amount are required' });
        }

        const number = phoneNumber.replace(/^0/, '').replace(/^\+254/, '').replace(/^254/, '');
        const formattedPhone = `254${number}`;

        const access_token = await getAccessToken();

        const BusinessShortCode = process.env.BusinessShortCode;
        const MPESA_PASSKEY = process.env.MPESA_PASSKEY;
        const TILL_NUMBER = process.env.TILL_NUMBER;

        const timestamp = getTimeStamp();
        const password = Buffer.from(`${BusinessShortCode}${MPESA_PASSKEY}${timestamp}`).toString('base64');

        const domain = 'https://spectre-payment-server.vercel.app';

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
            AccountReference: accountReference || 'Spectre Tech',
            TransactionDesc: transactionDesc || 'Payment to Spectre Tech'
        };

        console.log('STK Push Request:', { ...body, Password: '[HIDDEN]' });

        const response = await axios.post('https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest', body, {
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            }
        });

        const stkResponse = response.data;
        console.log('STK Push Response:', stkResponse);

        if (stkResponse.ResponseCode === '0') {
            return res.status(200).json({
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
            error: error.response?.data?.errorMessage || error.message || 'Internal server error'
        });
    }
};
