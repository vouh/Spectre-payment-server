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
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { checkoutRequestID } = req.body;

        if (!checkoutRequestID) {
            return res.status(400).json({ success: false, error: 'checkoutRequestID is required' });
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

        const response = await axios.post('https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query', body, {
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            }
        });

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

        return res.status(200).json({
            success: true,
            status: status,
            resultCode: resultCode,
            message: message
        });

    } catch (error) {
        console.error('Query Error:', error.response?.data || error.message);
        
        if (error.response?.data?.errorMessage?.includes('pending')) {
            return res.status(200).json({
                success: true,
                status: 'pending',
                message: 'Transaction is still being processed'
            });
        }

        return res.status(200).json({
            success: true,
            status: 'pending',
            message: 'Checking payment status...'
        });
    }
};
