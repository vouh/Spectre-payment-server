/**
 * Vercel Serverless Function - M-Pesa STK Query
 * Spectre Tech Limited Payment System
 * 
 * This endpoint checks the status of an STK Push request
 */

import axios from 'axios';

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
        auth: { 
            username: CONSUMER_KEY, 
            password: CONSUMER_SECRET 
        },
        headers: { 'Accept': 'application/json' }
    });
    
    return response.data.access_token;
}

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { checkoutRequestID } = req.body;

        if (!checkoutRequestID) {
            return res.status(400).json({ 
                success: false, 
                error: 'checkoutRequestID is required' 
            });
        }

        // Get access token
        const access_token = await getAccessToken();

        // Get credentials from environment
        const BusinessShortCode = process.env.BusinessShortCode;
        const MPESA_PASSKEY = process.env.MPESA_PASSKEY;

        // Generate timestamp and password
        const timestamp = getTimeStamp();
        const password = Buffer.from(`${BusinessShortCode}${MPESA_PASSKEY}${timestamp}`).toString('base64');

        const queryUrl = 'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query';

        const body = {
            "BusinessShortCode": BusinessShortCode,
            "Password": password,
            "Timestamp": timestamp,
            "CheckoutRequestID": checkoutRequestID
        };

        const response = await axios.post(queryUrl, body, {
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            }
        });

        const queryResponse = response.data;
        console.log('STK Query Response:', queryResponse);

        const resultCode = String(queryResponse.ResultCode);
        const resultDesc = queryResponse.ResultDesc;

        // Interpret result codes
        let status = 'pending';
        let message = resultDesc;

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
            message = 'Transaction timed out. No response from user.';
        } else if (resultCode === '2001') {
            status = 'failed';
            message = 'Wrong PIN entered';
        } else if (queryResponse.errorCode) {
            // Still processing
            status = 'pending';
            message = 'Transaction is still being processed';
        }

        return res.status(200).json({
            success: true,
            status: status,
            resultCode: resultCode,
            message: message,
            data: queryResponse
        });

    } catch (error) {
        console.error('STK Query Error:', error.response?.data || error.message);
        
        // If error contains "pending" in message, transaction is still processing
        if (error.response?.data?.errorMessage?.includes('pending')) {
            return res.status(200).json({
                success: true,
                status: 'pending',
                message: 'Transaction is still being processed'
            });
        }

        return res.status(500).json({
            success: false,
            status: 'error',
            error: error.response?.data?.errorMessage || error.message || 'Query failed'
        });
    }
}
