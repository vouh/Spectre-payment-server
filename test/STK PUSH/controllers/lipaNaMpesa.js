import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import { getTimeStamp } from '../utils/timestamp.utils.js';
import {authToken} from '../middlewares/authorization.js'

dotenv.config();
const router = express.Router();


router.post("/lipaNaMpesa", authToken, async (req, res) => {
  try {

//------STK PUSH SENDING REQUEST-    

        const number = req.body.phoneNumber.replace(/^0/, ''); // remove leading 0 if any
        const phoneNumber = `254${number}`;
        const timestamp = getTimeStamp();

        // Get access_token properly (req.authData must be set by middleware)
        const access_token = req.authData;
        if (!access_token) {
          return res.status(401).json({ error: "Access token missing" });
        }

        // Callback URL
        const domain = process.env.DOMAIN || req.domain;
        console.log(domain);

        


        const BusinessShortCode = String(process.env.BusinessShortCode || '').trim();
        const MPESA_PASSKEY = String(process.env.MPESA_PASSKEY || '').trim();
        const TILL_NUMBER = String(process.env.TILL_NUMBER || '').trim();

        const password = Buffer.from(`${BusinessShortCode}${MPESA_PASSKEY}${timestamp}`).toString('base64');

        const stkUrl = 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

        if (!TILL_NUMBER || TILL_NUMBER === '') {
          return res.status(500).json({ error: 'Missing TILL_NUMBER in environment. Set your BuyGoods/Till number in .env' });
        }

        // Fixed AccountReference and TransactionDesc - not editable by users
        const accountReference = 'Course Corner'; // Max 20 chars
        const transactionDesc = 'Pay 1 to Course Corner'; // Max 30 chars
        const amount = '1';

        const body = {
          "BusinessShortCode": BusinessShortCode, // HO/Store number used on Go Live
          "Password": password,
          "Timestamp": timestamp,
          "TransactionType": "CustomerBuyGoodsOnline",
          "Amount": amount,
          "PartyA": phoneNumber,
          "PartyB": TILL_NUMBER, // Till Number (credit party)
          "PhoneNumber": phoneNumber,
          "CallBackURL": `${domain}/callbackURL`,
          "AccountReference": accountReference,
          "TransactionDesc": transactionDesc
        };

        // STK PUSH

        const response = await axios.post(stkUrl, body, {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json'
          }
        });

        const stkResponse = response.data;

        console.log(stkResponse);

       

 //------ Checking Status of a transaction
 
          const queryEndpoint = 'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query';

          let resultCode, resultDesc;

          if (stkResponse.ResponseCode == '0') {

            const requestID = stkResponse.CheckoutRequestID;

            const queryPayload = {
              "BusinessShortCode": BusinessShortCode,
              "Password": password,
              "Timestamp": timestamp,
              "CheckoutRequestID": requestID
            };

            const timer = setInterval(async () => {
              try {
                const status = await axios.post(queryEndpoint, queryPayload, {
                  headers: {
                    Authorization: `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                  }
                });

                resultCode = String(status.data.ResultCode);
                resultDesc = status.data.ResultDesc;

                console.log('Query response:', resultCode, resultDesc);

                if (resultCode === '0') {
                  res.render('success',  {type: "Successful", 
                                    heading: "Payment Request Successful",
                                    desc: "The payment request was processed successfully."
                    });      
                    clearInterval(timer);

                } else if(resultCode === '1032') {
                  res.render('failed', {type: "cancelled", 
                                        heading: "You cancelled the request",
                                        desc: "The user cancelled the request on their phone. Please try again and enter your pin to confirm payment"
                                        });
                  clearInterval(timer);

                        
              } else if(resultCode === '1') {
                res.render('failed', {type: "failed", 
                                      heading: "Request failed due to insufficient balance",
                                      desc: "Please deposit funds on your M-PESA or use Overdraft(Fuliza) to complete the transaction"
                                      });     
                clearInterval(timer);
            
              } else {
                res.render('failed', {type: "failed", 
                                      heading: "Payment request failed",
                                      desc: `${resultDesc}. Please try again to complete the transaction`,
                                      });
                  clearInterval(timer);

                  }

              } catch (error) {
                console.error('Error in STK Push query:', error.response ? error.response.data : error.message);
                


              }
            }, 15000); 

          }


      } catch (error) {
        console.error("STK Push Error:", error.response?.data || error.message);
        const errorData = error.response?.data;
        // console.log(errorData)
        const errorMessage = errorData.errorMessage;

        // console.log(errorMessage);
        res.render('failed', {  type: "failed", 
                                heading: "Error sending the push request",
                                desc: errorMessage}
        )
      }
});



export default router;
