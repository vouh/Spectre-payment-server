import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

const app = express();
dotenv.config();

const url = 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
const CONSUMER_KEY = String(process.env.CONSUMER_KEY || '').trim();
const CONSUMER_SECRET = String(process.env.CONSUMER_SECRET || '').trim();

export async function authToken(req, res, next) { 
    try {
        const result = await axios.get(url, {
            auth: { username: CONSUMER_KEY, password: CONSUMER_SECRET },
            headers: { 'Accept': 'application/json' }
        });

        req.authData = result.data.access_token;        

        next();
    } catch (error) {
        console.error('Authentication Error:', error);

        if (axios.isAxiosError(error)) {
            if (error.response && error.response.status === 400) {
                return res.status(400).json({ error: "Request Failed: Invalid Authentication Details", details: error.message });
            } else {
                return res.status(500).json({ error: "Error fetching data", details: error.message });
            }
        } else {
            return res.status(500).json({ error: "Internal Server Error", details: error.message });
        }
    }
}

