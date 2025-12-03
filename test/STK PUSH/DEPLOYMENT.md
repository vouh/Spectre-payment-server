# Production Deployment Plan (Render) for M-PESA STK Push

## Overview
Deploy the Node.js STK Push backend to Render (no ngrok), switch to Safaricom production, configure env vars, and verify live transactions.

## 1) Hosting
- Use Render Web Service (managed HTTPS, environment vars, auto-deploy from Git).
- Alternatives: Railway/Fly.io/AWS EB, but instructions below assume Render.

## 2) Environment Variables (Render Dashboard)
Set these as “Secret Files” or “Environment” variables:
- CONSUMER_KEY = <Safaricom Prod Consumer Key>
- CONSUMER_SECRET = <Safaricom Prod Consumer Secret>
- BusinessShortCode = <Prod Shortcode>
- MPESA_PASSKEY = <Prod Passkey>
- DOMAIN = https://<yourapp>.onrender.com
- PORT is provided by Render automatically; your app already respects process.env.PORT.

## 3) Production Endpoints
- OAuth: https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials
- STK Push: https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest
- STK Query: https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query

## 4) Callback URL
- Your route is POST /callbackURL
- Set Callback URL in Safaricom Developer Portal (Production) to:
  - https://<yourapp>.onrender.com/callbackURL

## 5) Render Setup
- Push this repo to GitHub.
- Create a Render “Web Service” from the repo.
- Runtime: Node 18 or 20
- Build command: (leave empty unless you need)  
- Start command: node server.js (or npm start if configured)
- Health check: GET / should return 200 and load a page.

## 6) Go-Live Checklist
- Confirm / is reachable on your Render URL.
- Test POST /callbackURL with JSON; should 200 OK.
- Trigger STK: POST /lipaNaMpesa with { "phoneNumber": "07XXXXXXXX" }.
- Watch Render Logs: OAuth token OK, STK push response (CheckoutRequestID), callback received, and query results.

## 7) Hardening (Optional but recommended)
- Persistence: store transactions, callbacks, and statuses (Render Postgres is easy).
- Idempotency: dedupe callbacks using MerchantRequestID/CheckoutRequestID.
- Monitoring: set up alerts, structured logs, and graceful error responses.

## 8) Operations
- Redeploys triggered by pushes to your main branch.
- Update DOMAIN if you move custom domains.
- Rotate keys via Render env vars without changing code.
