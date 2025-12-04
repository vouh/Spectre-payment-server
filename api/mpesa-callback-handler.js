/**
 * M-Pesa Callback Handler & Receipt Decryptor
 * Spectre Tech Limited Payment System
 * 
 * This module handles M-Pesa callback responses and extracts
 * the MpesaReceiptNumber for PDF generation and database storage
 */

// In-memory store for pending transactions (in production, use Redis or database)
const pendingTransactions = new Map();

/**
 * Parse M-Pesa callback payload and extract receipt details
 * @param {Object} callbackData - Raw callback data from M-Pesa
 * @returns {Object} - Parsed payment result
 */
function parseCallback(callbackData) {
    try {
        const stkCallback = callbackData?.Body?.stkCallback;
        
        if (!stkCallback) {
            return {
                success: false,
                error: 'Invalid callback structure'
            };
        }

        const result = {
            merchantRequestID: stkCallback.MerchantRequestID,
            checkoutRequestID: stkCallback.CheckoutRequestID,
            resultCode: stkCallback.ResultCode,
            resultDesc: stkCallback.ResultDesc,
            success: stkCallback.ResultCode === 0
        };

        // If successful, extract metadata
        if (result.success && stkCallback.CallbackMetadata?.Item) {
            const metadata = extractMetadata(stkCallback.CallbackMetadata.Item);
            result.metadata = metadata;
            result.mpesaReceiptNumber = metadata.MpesaReceiptNumber;
            result.amount = metadata.Amount;
            result.transactionDate = metadata.TransactionDate;
            result.phoneNumber = metadata.PhoneNumber;
        }

        return result;
    } catch (error) {
        console.error('Error parsing callback:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Extract metadata items into a key-value object
 * @param {Array} items - Callback metadata items array
 * @returns {Object} - Key-value pairs of metadata
 */
function extractMetadata(items) {
    const metadata = {};
    
    items.forEach(item => {
        metadata[item.Name] = item.Value;
    });
    
    return metadata;
}

/**
 * Format transaction date from M-Pesa format
 * @param {number|string} mpesaDate - Date in YYYYMMDDHHmmss format
 * @returns {Object} - Formatted date and time strings
 */
function formatTransactionDate(mpesaDate) {
    const dateStr = String(mpesaDate);
    
    if (dateStr.length !== 14) {
        return { date: 'N/A', time: 'N/A' };
    }
    
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const hour = dateStr.substring(8, 10);
    const minute = dateStr.substring(10, 12);
    const second = dateStr.substring(12, 14);
    
    const date = new Date(year, month - 1, day, hour, minute, second);
    
    return {
        date: date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }),
        time: date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }),
        timestamp: date.toISOString()
    };
}

/**
 * Store pending transaction for later retrieval
 * @param {string} checkoutRequestID - The checkout request ID
 * @param {Object} transactionData - Initial transaction data
 */
function storePendingTransaction(checkoutRequestID, transactionData) {
    pendingTransactions.set(checkoutRequestID, {
        ...transactionData,
        status: 'pending',
        createdAt: new Date().toISOString()
    });
    
    // Auto-cleanup after 10 minutes
    setTimeout(() => {
        pendingTransactions.delete(checkoutRequestID);
    }, 10 * 60 * 1000);
}

/**
 * Update transaction with callback data
 * @param {string} checkoutRequestID - The checkout request ID
 * @param {Object} callbackResult - Parsed callback result
 * @returns {Object} - Updated transaction data
 */
function updateTransactionWithCallback(checkoutRequestID, callbackResult) {
    const pending = pendingTransactions.get(checkoutRequestID);
    
    if (!pending) {
        return {
            ...callbackResult,
            originalTransaction: null
        };
    }
    
    const dateInfo = callbackResult.transactionDate 
        ? formatTransactionDate(callbackResult.transactionDate)
        : { date: pending.date, time: pending.time };
    
    const updated = {
        ...pending,
        ...callbackResult,
        status: callbackResult.success ? 'completed' : 'failed',
        mpesaReceiptNumber: callbackResult.mpesaReceiptNumber || null,
        date: dateInfo.date,
        time: dateInfo.time,
        timestamp: dateInfo.timestamp || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    pendingTransactions.set(checkoutRequestID, updated);
    
    return updated;
}

/**
 * Get transaction by checkout request ID
 * @param {string} checkoutRequestID - The checkout request ID
 * @returns {Object|null} - Transaction data or null
 */
function getTransaction(checkoutRequestID) {
    return pendingTransactions.get(checkoutRequestID) || null;
}

/**
 * Get result code description
 * @param {number} resultCode - M-Pesa result code
 * @returns {string} - Human readable description
 */
function getResultDescription(resultCode) {
    const descriptions = {
        0: 'Transaction successful',
        1: 'Insufficient balance',
        2: 'Amount below minimum limit (KES 1)',
        3: 'Amount exceeds maximum transaction limit',
        4: 'Would exceed daily transfer limit',
        8: 'Would exceed maximum account balance',
        17: 'Duplicate transaction - wait 2 minutes',
        1019: 'Transaction expired',
        1025: 'USSD prompt too long',
        1032: 'Transaction cancelled by user',
        1037: 'Phone unreachable or busy',
        2001: 'Wrong M-Pesa PIN entered',
        2028: 'Invalid transaction type or PartyB'
    };
    
    return descriptions[resultCode] || `Unknown error (Code: ${resultCode})`;
}

/**
 * Prepare receipt data for PDF generation
 * @param {Object} transaction - Transaction data with M-Pesa receipt
 * @returns {Object} - Data formatted for PDF
 */
function prepareReceiptData(transaction) {
    return {
        // M-Pesa Receipt Number (the real one from callback)
        mpesaReceiptNumber: transaction.mpesaReceiptNumber || 'PENDING',
        
        // Payment details
        amount: transaction.amount,
        formattedAmount: `KES ${Number(transaction.amount || 0).toLocaleString()}`,
        
        // Customer info
        phoneNumber: formatPhoneNumber(transaction.phoneNumber || transaction.phone),
        
        // Transaction info
        transactionDate: transaction.date,
        transactionTime: transaction.time,
        
        // Additional info
        accountReference: transaction.accountReference || 'SpectreTech',
        transactionDesc: transaction.transactionDesc || transaction.reason || 'Payment',
        
        // Status
        status: transaction.status || (transaction.success ? 'completed' : 'failed'),
        resultDescription: transaction.resultDesc || getResultDescription(transaction.resultCode)
    };
}

/**
 * Format phone number for display
 * @param {string|number} phone - Phone number
 * @returns {string} - Formatted phone number
 */
function formatPhoneNumber(phone) {
    const phoneStr = String(phone).replace(/\D/g, '');
    
    if (phoneStr.startsWith('254')) {
        return '+254 ' + phoneStr.substring(3, 6) + ' ' + phoneStr.substring(6);
    }
    
    if (phoneStr.startsWith('0')) {
        return phoneStr.substring(0, 4) + ' ' + phoneStr.substring(4);
    }
    
    return phoneStr;
}

// Export for use in server.js
export {
    parseCallback,
    extractMetadata,
    formatTransactionDate,
    storePendingTransaction,
    updateTransactionWithCallback,
    getTransaction,
    getResultDescription,
    prepareReceiptData,
    formatPhoneNumber,
    pendingTransactions
};

export default {
    parseCallback,
    storePendingTransaction,
    updateTransactionWithCallback,
    getTransaction,
    prepareReceiptData
};
