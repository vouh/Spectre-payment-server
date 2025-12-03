module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'POST') {
        const callbackData = req.body;
        console.log('M-Pesa Callback:', JSON.stringify(callbackData, null, 2));

        return res.status(200).json({
            ResultCode: 0,
            ResultDesc: 'Callback received'
        });
    }

    return res.status(200).json({ message: 'Callback endpoint ready' });
};
