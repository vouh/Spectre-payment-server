/**
 * Payment Service - Firebase Payment Operations
 * Spectre Tech Limited Payment System
 * 
 * Handles all payment-related database operations
 */

import {
    db,
    COLLECTIONS,
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
} from './firebase-config.js';

/**
 * Payment Service Class
 */
class PaymentService {
    constructor() {
        this.collection = COLLECTIONS.PAYMENTS;
    }

    /**
     * Save a new payment to the database
     * @param {Object} paymentData - Payment details
     * @returns {Object} - Result with success status and document ID
     */
    async savePayment(paymentData) {
        try {
            const docRef = await addDoc(collection(db, this.collection), {
                ...paymentData,
                createdAt: new Date().toISOString(),
                serverTimestamp: serverTimestamp(),
                status: paymentData.status || 'pending'
            });
            console.log("✅ Payment saved:", docRef.id);
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error("❌ Error saving payment:", error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update payment with M-Pesa receipt number
     * @param {string} paymentId - Document ID
     * @param {string} mpesaReceiptNumber - M-Pesa receipt number from callback
     * @param {Object} additionalData - Any additional data to update
     * @returns {Object} - Result
     */
    async updateWithMpesaReceipt(paymentId, mpesaReceiptNumber, additionalData = {}) {
        try {
            const docRef = doc(db, this.collection, paymentId);
            await updateDoc(docRef, {
                mpesaReceiptNumber: mpesaReceiptNumber,
                status: 'completed',
                ...additionalData,
                updatedAt: new Date().toISOString()
            });
            console.log("✅ Payment updated with M-Pesa receipt:", mpesaReceiptNumber);
            return { success: true };
        } catch (error) {
            console.error("❌ Error updating payment:", error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update payment by checkout request ID
     * @param {string} checkoutRequestID - M-Pesa checkout request ID
     * @param {Object} updateData - Data to update
     * @returns {Object} - Result
     */
    async updateByCheckoutRequestID(checkoutRequestID, updateData) {
        try {
            const q = query(
                collection(db, this.collection),
                where("checkoutRequestID", "==", checkoutRequestID)
            );
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                return { success: false, error: "Payment not found" };
            }

            const paymentDoc = querySnapshot.docs[0];
            await updateDoc(doc(db, this.collection, paymentDoc.id), {
                ...updateData,
                updatedAt: new Date().toISOString()
            });

            return { success: true, id: paymentDoc.id };
        } catch (error) {
            console.error("❌ Error updating by checkout ID:", error);
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
            const docRef = doc(db, this.collection, paymentId);
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
     * Get payment by M-Pesa receipt number
     * @param {string} mpesaReceiptNumber - M-Pesa receipt number
     * @returns {Object} - Payment data
     */
    async getByMpesaReceipt(mpesaReceiptNumber) {
        try {
            const q = query(
                collection(db, this.collection),
                where("mpesaReceiptNumber", "==", mpesaReceiptNumber)
            );
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                return { success: false, error: "Payment not found" };
            }
            
            const paymentDoc = querySnapshot.docs[0];
            return { success: true, data: { id: paymentDoc.id, ...paymentDoc.data() } };
        } catch (error) {
            console.error("❌ Error getting payment by receipt:", error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get all payments with optional filters
     * @param {Object} options - Query options
     * @returns {Array} - List of payments
     */
    async getAllPayments(options = {}) {
        try {
            const { 
                limitCount = 100, 
                status = null, 
                category = null,
                startDate = null,
                endDate = null 
            } = options;

            let q = query(
                collection(db, this.collection),
                orderBy("createdAt", "desc"),
                limit(limitCount)
            );

            // Note: Firestore requires composite indexes for multiple where clauses
            // For production, create these indexes in Firebase console

            const querySnapshot = await getDocs(q);
            let payments = [];
            
            querySnapshot.forEach((doc) => {
                const data = { id: doc.id, ...doc.data() };
                
                // Client-side filtering (for now, until indexes are set up)
                let include = true;
                
                if (status && data.status !== status) {
                    include = false;
                }
                
                if (category && data.category !== category) {
                    include = false;
                }
                
                if (startDate && new Date(data.createdAt) < new Date(startDate)) {
                    include = false;
                }
                
                if (endDate && new Date(data.createdAt) > new Date(endDate)) {
                    include = false;
                }
                
                if (include) {
                    payments.push(data);
                }
            });
            
            return { success: true, data: payments, count: payments.length };
        } catch (error) {
            console.error("❌ Error getting payments:", error);
            return { success: false, error: error.message, data: [] };
        }
    }

    /**
     * Get payments by phone number
     * @param {string} phone - Phone number to search
     * @returns {Array} - List of payments
     */
    async getPaymentsByPhone(phone) {
        try {
            const cleanPhone = phone.replace(/\s/g, '').replace(/^\+/, '');
            
            const q = query(
                collection(db, this.collection),
                where("phoneRaw", "==", cleanPhone)
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
     * Update payment status
     * @param {string} paymentId - Document ID
     * @param {string} status - New status (pending, completed, failed, cancelled)
     * @returns {Object} - Result
     */
    async updateStatus(paymentId, status) {
        try {
            const docRef = doc(db, this.collection, paymentId);
            await updateDoc(docRef, {
                status: status,
                updatedAt: new Date().toISOString()
            });
            console.log("✅ Payment status updated:", paymentId, "->", status);
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
            await deleteDoc(doc(db, this.collection, paymentId));
            console.log("✅ Payment deleted:", paymentId);
            return { success: true };
        } catch (error) {
            console.error("❌ Error deleting payment:", error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete multiple payments
     * @param {Array} paymentIds - Array of document IDs
     * @returns {Object} - Result with count
     */
    async deleteMultiple(paymentIds) {
        try {
            let deleted = 0;
            for (const id of paymentIds) {
                await deleteDoc(doc(db, this.collection, id));
                deleted++;
            }
            console.log("✅ Deleted", deleted, "payments");
            return { success: true, deleted };
        } catch (error) {
            console.error("❌ Error deleting payments:", error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Search payments by phone or M-Pesa code
     * @param {string} searchTerm - Search term
     * @returns {Array} - Matching payments
     */
    async searchPayments(searchTerm) {
        try {
            // Get all recent payments and filter client-side
            const result = await this.getAllPayments({ limitCount: 500 });
            
            if (!result.success) {
                return result;
            }

            const term = searchTerm.toLowerCase().replace(/\s/g, '');
            
            const filtered = result.data.filter(payment => {
                const phone = (payment.phoneRaw || payment.phone || '').toLowerCase();
                const mpesaCode = (payment.mpesaReceiptNumber || payment.code || '').toLowerCase();
                
                return phone.includes(term) || mpesaCode.includes(term);
            });

            return { success: true, data: filtered, count: filtered.length };
        } catch (error) {
            console.error("❌ Error searching payments:", error);
            return { success: false, error: error.message };
        }
    }
}

// Create and export singleton instance
const paymentService = new PaymentService();

export { PaymentService };
export default paymentService;
