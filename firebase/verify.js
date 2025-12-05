/**
 * Verification Service
 * Spectre Tech Limited Payment System
 * 
 * Dedicated service for verifying payments by receipt code or phone number
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    query,
    limit
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { firebaseConfig, COLLECTIONS } from './config.js';

// Initialize Firebase
let db;
try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log("🔥 Verify Service: Firebase initialized");
} catch (error) {
    // App might already be initialized
    console.log("Firebase verify init:", error.message);
}

/**
 * Normalize phone number for comparison
 * Removes spaces, +, -, and country code prefixes
 */
function normalizePhone(phone) {
    if (!phone) return '';
    let clean = phone.toString().replace(/[\s+\-]/g, '');
    // Remove 254 or 0 prefix
    if (clean.startsWith('254')) clean = clean.substring(3);
    if (clean.startsWith('0')) clean = clean.substring(1);
    return clean;
}

/**
 * Search payments by phone number
 * Returns all completed payments matching the phone
 */
export async function searchByPhone(phone) {
    try {
        const normalizedSearch = normalizePhone(phone);
        console.log("🔍 Searching by phone:", normalizedSearch);
        
        if (normalizedSearch.length < 9) {
            return { success: false, error: "Phone number too short", data: [] };
        }

        // Get all payments and filter client-side (avoids index issues)
        const paymentsRef = collection(db, COLLECTIONS.PAYMENTS);
        const q = query(paymentsRef, limit(1000));
        const snapshot = await getDocs(q);
        
        const payments = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Only include completed payments
            if (data.status !== 'completed') return;
            
            // Normalize stored phone and compare
            const storedPhone = normalizePhone(data.phone || data.phoneRaw);
            
            if (storedPhone === normalizedSearch || 
                storedPhone.includes(normalizedSearch) || 
                normalizedSearch.includes(storedPhone)) {
                payments.push({ id: doc.id, ...data });
            }
        });

        // Sort by date descending
        payments.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });

        console.log(`✅ Found ${payments.length} payments for phone`);
        return { success: true, data: payments, count: payments.length };
    } catch (error) {
        console.error("❌ Search by phone error:", error);
        return { success: false, error: error.message, data: [] };
    }
}

/**
 * Search payment by M-Pesa receipt number or code
 * Returns matching completed payment(s)
 */
export async function searchByReceipt(receiptCode) {
    try {
        const upperCode = receiptCode.toUpperCase().trim();
        console.log("🔍 Searching by receipt:", upperCode);

        if (upperCode.length < 5) {
            return { success: false, error: "Receipt code too short", data: [] };
        }

        // Get all payments and filter client-side
        const paymentsRef = collection(db, COLLECTIONS.PAYMENTS);
        const q = query(paymentsRef, limit(1000));
        const snapshot = await getDocs(q);
        
        const payments = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Only include completed payments
            if (data.status !== 'completed') return;
            
            const mpesaReceipt = (data.mpesaReceiptNumber || '').toUpperCase();
            const code = (data.code || '').toUpperCase();
            
            if (mpesaReceipt === upperCode || code === upperCode) {
                payments.push({ id: doc.id, ...data });
            }
        });

        console.log(`✅ Found ${payments.length} payments for receipt`);
        return { success: true, data: payments, count: payments.length };
    } catch (error) {
        console.error("❌ Search by receipt error:", error);
        return { success: false, error: error.message, data: [] };
    }
}

/**
 * Search payments - auto-detects if input is phone or receipt code
 */
export async function searchPayments(searchTerm) {
    const term = searchTerm.trim();
    
    if (!term) {
        return { success: false, error: "Search term is required", data: [] };
    }

    // Determine if it's a phone number (mostly digits) or receipt code
    const digitsOnly = term.replace(/[\s+\-]/g, '');
    const isPhone = /^\d{9,12}$/.test(digitsOnly);

    if (isPhone) {
        return await searchByPhone(term);
    } else {
        return await searchByReceipt(term);
    }
}

// Export for global access
window.VerifyService = {
    searchPayments,
    searchByPhone,
    searchByReceipt
};

export default { searchPayments, searchByPhone, searchByReceipt };
