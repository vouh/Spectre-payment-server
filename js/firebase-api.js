/**
 * Firebase API - Database Operations Handler
 * Spectre Tech Limited Payment System
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    getDoc,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyB2CXyFin6LNLTXe4C_Dj8HrAkwIhbuQPs",
    authDomain: "spectre-payment.firebaseapp.com",
    projectId: "spectre-payment",
    storageBucket: "spectre-payment.firebasestorage.app",
    messagingSenderId: "384792827904",
    appId: "1:384792827904:web:4a08eed1fe885f9cab60e5",
    measurementId: "G-J0BZ9STKZ1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

console.log("🔥 Firebase API initialized");

// ============================================
// DATABASE API CLASS
// ============================================

class FirebaseAPI {
    constructor() {
        this.db = db;
        this.collections = {
            payments: 'payments',
            users: 'users',
            transactions: 'transactions',
            logs: 'logs'
        };
    }

    // ============================================
    // CONNECTION TEST
    // ============================================
    
    async testConnection() {
        try {
            const testDoc = await addDoc(collection(this.db, "test_connection"), {
                message: "Firebase connection test",
                timestamp: new Date().toISOString()
            });
            console.log("✅ Firebase connected! Test document ID:", testDoc.id);
            return { success: true, id: testDoc.id };
        } catch (error) {
            console.error("❌ Firebase connection error:", error);
            return { success: false, error: error.message };
        }
    }

    // ============================================
    // PAYMENT OPERATIONS
    // ============================================

    /**
     * Save a new payment to the database
     * @param {Object} paymentData - Payment details
     * @returns {Object} - Result with success status and document ID
     */
    async savePayment(paymentData) {
        try {
            const docRef = await addDoc(collection(this.db, this.collections.payments), {
                ...paymentData,
                createdAt: new Date().toISOString(),
                serverTimestamp: serverTimestamp(),
                status: paymentData.status || "completed"
            });
            console.log("✅ Payment saved:", docRef.id);
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error("❌ Error saving payment:", error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get a payment by ID
     * @param {string} paymentId - Document ID
     * @returns {Object} - Payment data
     */
    async getPayment(paymentId) {
        try {
            const docRef = doc(this.db, this.collections.payments, paymentId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
            } else {
                return { success: false, error: "Payment not found" };
            }
        } catch (error) {
            console.error("❌ Error getting payment:", error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get all payments
     * @param {number} limitCount - Maximum number of results
     * @returns {Array} - List of payments
     */
    async getAllPayments(limitCount = 50) {
        try {
            const q = query(
                collection(this.db, this.collections.payments),
                orderBy("createdAt", "desc"),
                limit(limitCount)
            );
            const querySnapshot = await getDocs(q);
            const payments = [];
            
            querySnapshot.forEach((doc) => {
                payments.push({ id: doc.id, ...doc.data() });
            });
            
            return { success: true, data: payments, count: payments.length };
        } catch (error) {
            console.error("❌ Error getting payments:", error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get payments by phone number
     * @param {string} phone - Phone number to search
     * @returns {Array} - List of payments
     */
    async getPaymentsByPhone(phone) {
        try {
            const q = query(
                collection(this.db, this.collections.payments),
                where("phoneRaw", "==", phone.replace(/\s/g, ''))
            );
            const querySnapshot = await getDocs(q);
            const payments = [];
            
            querySnapshot.forEach((doc) => {
                payments.push({ id: doc.id, ...doc.data() });
            });
            
            return { success: true, data: payments, count: payments.length };
        } catch (error) {
            console.error("❌ Error getting payments by phone:", error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get payment by receipt code
     * @param {string} code - Receipt code
     * @returns {Object} - Payment data
     */
    async getPaymentByCode(code) {
        try {
            const q = query(
                collection(this.db, this.collections.payments),
                where("code", "==", code)
            );
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                return { success: false, error: "Payment not found" };
            }
            
            const doc = querySnapshot.docs[0];
            return { success: true, data: { id: doc.id, ...doc.data() } };
        } catch (error) {
            console.error("❌ Error getting payment by code:", error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update payment status
     * @param {string} paymentId - Document ID
     * @param {string} status - New status
     * @returns {Object} - Result
     */
    async updatePaymentStatus(paymentId, status) {
        try {
            const docRef = doc(this.db, this.collections.payments, paymentId);
            await updateDoc(docRef, {
                status: status,
                updatedAt: new Date().toISOString()
            });
            console.log("✅ Payment status updated:", paymentId);
            return { success: true };
        } catch (error) {
            console.error("❌ Error updating payment:", error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete a payment
     * @param {string} paymentId - Document ID
     * @returns {Object} - Result
     */
    async deletePayment(paymentId) {
        try {
            await deleteDoc(doc(this.db, this.collections.payments, paymentId));
            console.log("✅ Payment deleted:", paymentId);
            return { success: true };
        } catch (error) {
            console.error("❌ Error deleting payment:", error);
            return { success: false, error: error.message };
        }
    }

    // ============================================
    // TRANSACTION LOGGING
    // ============================================

    /**
     * Log a transaction event
     * @param {string} type - Event type (e.g., 'payment_initiated', 'payment_completed')
     * @param {Object} data - Event data
     * @returns {Object} - Result
     */
    async logTransaction(type, data) {
        try {
            const docRef = await addDoc(collection(this.db, this.collections.logs), {
                type: type,
                data: data,
                timestamp: new Date().toISOString(),
                serverTimestamp: serverTimestamp()
            });
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error("❌ Error logging transaction:", error);
            return { success: false, error: error.message };
        }
    }

    // ============================================
    // STATISTICS
    // ============================================

    /**
     * Get payment statistics
     * @returns {Object} - Statistics data
     */
    async getStats() {
        try {
            const querySnapshot = await getDocs(collection(this.db, this.collections.payments));
            let totalAmount = 0;
            let count = 0;
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.amountRaw) {
                    totalAmount += data.amountRaw;
                }
                count++;
            });
            
            return {
                success: true,
                data: {
                    totalPayments: count,
                    totalAmount: totalAmount,
                    formattedAmount: `KES ${totalAmount.toLocaleString()}`
                }
            };
        } catch (error) {
            console.error("❌ Error getting stats:", error);
            return { success: false, error: error.message };
        }
    }
}

// Create and export API instance
const firebaseAPI = new FirebaseAPI();

// Make available globally
window.FirebaseAPI = firebaseAPI;

// Helper function for testing from console
window.testFirebase = async function() {
    const result = await firebaseAPI.testConnection();
    if (result.success) {
        alert("✅ Firebase connected!\nDocument ID: " + result.id);
    } else {
        alert("❌ Connection failed: " + result.error);
    }
    return result;
};

// Helper to get all payments from console
window.getAllPayments = async function() {
    const result = await firebaseAPI.getAllPayments();
    console.table(result.data);
    return result;
};

// Helper to get payment stats from console
window.getPaymentStats = async function() {
    const result = await firebaseAPI.getStats();
    console.log(result.data);
    return result;
};

console.log("🔥 Firebase API ready!");
console.log("📌 Available console commands:");
console.log("   • testFirebase() - Test connection");
console.log("   • getAllPayments() - Get all payments");
console.log("   • getPaymentStats() - Get statistics");

// Export for module usage
export default firebaseAPI;
export { firebaseAPI, db };
