/**
 * Vercel Serverless Function - Health Check
 * Spectre Tech Limited Payment System
 */

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    return res.status(200).json({
        success: true,
        message: 'Spectre Payment API is running',
        timestamp: new Date().toISOString(),
        endpoints: {
            stkpush: '/api/stkpush',
            query: '/api/query',
            callback: '/api/callback'
        }
    });
}
