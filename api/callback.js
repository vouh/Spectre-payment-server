/**
 * Vercel Serverless Function - M-Pesa Callback Handler
 * Spectre Tech Limited Payment System
 * 
 * This endpoint receives callbacks from M-Pesa after payment processing
 */

// In-memory store for demo (in production, use a database)
// Vercel serverless functions are stateless, so this is for immediate response only
// The real data should be stored in Firebase from the frontend

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'POST') {
        try {
            const callbackData = req.body;
            
            console.log('=== M-Pesa Callback Received ===');
            console.log(JSON.stringify(callbackData, null, 2));

            // Extract the result from callback
            const stkCallback = callbackData?.Body?.stkCallback;
            
            if (stkCallback) {
                const resultCode = stkCallback.ResultCode;
                const resultDesc = stkCallback.ResultDesc;
                const merchantRequestID = stkCallback.MerchantRequestID;
                const checkoutRequestID = stkCallback.CheckoutRequestID;

                console.log('Result Code:', resultCode);
                console.log('Result Desc:', resultDesc);
                console.log('Checkout Request ID:', checkoutRequestID);

                // If successful, extract payment details
                if (resultCode === 0) {
                    const callbackMetadata = stkCallback.CallbackMetadata?.Item || [];
                    const paymentDetails = {};
                    
                    callbackMetadata.forEach(item => {
                        paymentDetails[item.Name] = item.Value;
                    });

                    console.log('Payment Details:', paymentDetails);
                    
                    // Here you would typically:
                    // 1. Store in database
                    // 2. Send notification
                    // 3. Update order status
                }
            }

            // Always respond with success to M-Pesa
            return res.status(200).json({
                ResultCode: 0,
                ResultDesc: 'Callback received successfully'
            });

        } catch (error) {
            console.error('Callback Error:', error);
            return res.status(200).json({
                ResultCode: 0,
                ResultDesc: 'Callback processed'
            });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
