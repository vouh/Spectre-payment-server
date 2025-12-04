/**
 * Firebase Client - Main Firebase Module
 * Spectre Tech Limited Payment System
 * 
 * Single source of truth for Firebase initialization and all operations
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
    serverTimestamp,
    Timestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { firebaseConfig, COLLECTIONS } from './config.js';

// ============================================
// FIREBASE INITIALIZATION (Singleton)
// ============================================

let app;
let db;
let auth;
let analytics;

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    
    if (typeof window !== 'undefined') {
        analytics = getAnalytics(app);
    }
    
    console.log("🔥 Firebase initialized successfully");
} catch (error) {
    console.log("Firebase init:", error.message);
}

// ============================================
// PAYMENT SERVICE
// ============================================

const PaymentService = {
    /**
     * Save a new payment
     */
    async save(paymentData) {
        try {
            const docRef = await addDoc(collection(db, COLLECTIONS.PAYMENTS), {
                ...paymentData,
                createdAt: new Date().toISOString(),
                serverTimestamp: serverTimestamp(),
                status: paymentData.status || 'completed'
            });
            console.log("✅ Payment saved:", docRef.id);
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error("❌ Error saving payment:", error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Get payment by ID
     */
    async get(paymentId) {
        try {
            const docRef = doc(db, COLLECTIONS.PAYMENTS, paymentId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
            }
            return { success: false, error: "Payment not found" };
        } catch (error) {
            console.error("❌ Error getting payment:", error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Get all payments with optional limit
     */
    async getAll(limitCount = 100) {
        try {
            const q = query(
                collection(db, COLLECTIONS.PAYMENTS),
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
            return { success: false, error: error.message, data: [] };
        }
    },

    /**
     * Get payments by phone number
     */
    async getByPhone(phone) {
        try {
            const cleanPhone = phone.replace(/\s/g, '').replace(/^\+/, '');
            const q = query(
                collection(db, COLLECTIONS.PAYMENTS),
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
    },

    /**
     * Get payment by M-Pesa receipt number
     */
    async getByMpesaReceipt(mpesaReceiptNumber) {
        try {
            const q = query(
                collection(db, COLLECTIONS.PAYMENTS),
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
    },

    /**
     * Update payment status
     */
    async updateStatus(paymentId, status) {
        try {
            const docRef = doc(db, COLLECTIONS.PAYMENTS, paymentId);
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
    },

    /**
     * Update payment with M-Pesa receipt
     */
    async updateWithMpesaReceipt(paymentId, mpesaReceiptNumber, additionalData = {}) {
        try {
            const docRef = doc(db, COLLECTIONS.PAYMENTS, paymentId);
            await updateDoc(docRef, {
                mpesaReceiptNumber,
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
    },

    /**
     * Delete payment
     */
    async delete(paymentId) {
        try {
            await deleteDoc(doc(db, COLLECTIONS.PAYMENTS, paymentId));
            console.log("✅ Payment deleted:", paymentId);
            return { success: true };
        } catch (error) {
            console.error("❌ Error deleting payment:", error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Delete multiple payments
     */
    async deleteMultiple(paymentIds) {
        try {
            let deleted = 0;
            for (const id of paymentIds) {
                await deleteDoc(doc(db, COLLECTIONS.PAYMENTS, id));
                deleted++;
            }
            console.log("✅ Deleted", deleted, "payments");
            return { success: true, deleted };
        } catch (error) {
            console.error("❌ Error deleting payments:", error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Search payments
     */
    async search(searchTerm) {
        try {
            const result = await this.getAll(500);
            if (!result.success) return result;

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
};

// ============================================
// STATS SERVICE
// ============================================

const StatsService = {
    /**
     * Get dashboard statistics
     */
    async getDashboardStats() {
        try {
            const querySnapshot = await getDocs(collection(db, COLLECTIONS.PAYMENTS));
            
            let total = 0;
            let completed = 0;
            let failed = 0;
            let revenue = 0;
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                total++;
                
                if (data.status === 'completed' || data.status === 'success') {
                    completed++;
                    const amount = parseFloat(data.amountRaw || data.amount || 0);
                    if (!isNaN(amount)) revenue += amount;
                } else if (data.status === 'failed' || data.status === 'cancelled') {
                    failed++;
                }
            });
            
            return {
                success: true,
                data: {
                    total,
                    completed,
                    failed,
                    pending: total - completed - failed,
                    revenue,
                    formattedRevenue: `KSH ${revenue.toLocaleString()}`
                }
            };
        } catch (error) {
            console.error("❌ Error getting stats:", error);
            return { 
                success: false, 
                error: error.message,
                data: { total: 0, completed: 0, failed: 0, pending: 0, revenue: 0 }
            };
        }
    },

    /**
     * Get category breakdown
     */
    async getCategoryStats() {
        try {
            const querySnapshot = await getDocs(collection(db, COLLECTIONS.PAYMENTS));
            const categories = {};
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const category = data.category || data.reason || 'Other';
                
                if (!categories[category]) {
                    categories[category] = { count: 0, revenue: 0 };
                }
                
                categories[category].count++;
                
                if (data.status === 'completed' || data.status === 'success') {
                    const amount = parseFloat(data.amountRaw || data.amount || 0);
                    if (!isNaN(amount)) categories[category].revenue += amount;
                }
            });
            
            return { success: true, data: categories };
        } catch (error) {
            console.error("❌ Error getting category stats:", error);
            return { success: false, error: error.message };
        }
    }
};

// ============================================
// AUTH SERVICE
// ============================================

const AuthService = {
    currentUser: null,

    /**
     * Sign in with email and password
     */
    async login(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            this.currentUser = userCredential.user;
            return {
                success: true,
                user: {
                    uid: userCredential.user.uid,
                    email: userCredential.user.email
                }
            };
        } catch (error) {
            console.error("❌ Login error:", error);
            
            const messages = {
                'auth/invalid-email': 'Invalid email address',
                'auth/user-disabled': 'Account disabled',
                'auth/user-not-found': 'No account found',
                'auth/wrong-password': 'Incorrect password',
                'auth/too-many-requests': 'Too many attempts',
                'auth/invalid-credential': 'Invalid credentials'
            };

            return { 
                success: false, 
                error: messages[error.code] || 'Login failed' 
            };
        }
    },

    /**
     * Sign out
     */
    async logout() {
        try {
            await signOut(auth);
            this.currentUser = null;
            return { success: true };
        } catch (error) {
            console.error("❌ Logout error:", error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Get current user
     */
    getCurrentUser() {
        return auth.currentUser;
    },

    /**
     * Listen for auth state changes
     */
    onAuthStateChange(callback) {
        return onAuthStateChanged(auth, callback);
    }
};

// ============================================
// LOGGING SERVICE
// ============================================

const LogService = {
    /**
     * Log a transaction event
     */
    async log(type, data) {
        try {
            const docRef = await addDoc(collection(db, COLLECTIONS.LOGS), {
                type,
                data,
                timestamp: new Date().toISOString(),
                serverTimestamp: serverTimestamp()
            });
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error("❌ Error logging:", error);
            return { success: false, error: error.message };
        }
    }
};

// ============================================
// LEGACY COMPATIBILITY (for existing code)
// ============================================

class FirebaseAPI {
    constructor() {
        this.db = db;
        this.collections = COLLECTIONS;
    }

    async testConnection() {
        try {
            const testDoc = await addDoc(collection(db, "test_connection"), {
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

    savePayment = PaymentService.save;
    getPayment = PaymentService.get;
    getAllPayments = PaymentService.getAll;
    getPaymentsByPhone = PaymentService.getByPhone;
    getPaymentByCode = PaymentService.getByMpesaReceipt;
    updatePaymentStatus = PaymentService.updateStatus;
    deletePayment = PaymentService.delete;
    logTransaction = LogService.log;
    getStats = StatsService.getDashboardStats;
}

// Create legacy API instance
const firebaseAPI = new FirebaseAPI();

// ============================================
// GLOBAL EXPORTS (for browser)
// ============================================

if (typeof window !== 'undefined') {
    // Legacy support
    window.FirebaseAPI = firebaseAPI;
    
    // New services
    window.PaymentService = PaymentService;
    window.StatsService = StatsService;
    window.AuthService = AuthService;
    window.LogService = LogService;
    
    // Helper functions
    window.testFirebase = async () => {
        const result = await firebaseAPI.testConnection();
        alert(result.success ? `✅ Connected! ID: ${result.id}` : `❌ Failed: ${result.error}`);
        return result;
    };
    
    window.getAllPayments = async () => {
        const result = await PaymentService.getAll();
        console.table(result.data);
        return result;
    };
    
    window.getPaymentStats = async () => {
        const result = await StatsService.getDashboardStats();
        console.log(result.data);
        return result;
    };
    
    // Save payment helper (used by index.html)
    window.savePaymentToFirebase = async (paymentData) => {
        return await PaymentService.save(paymentData);
    };
}

console.log("🔥 Firebase Client ready!");
console.log("📌 Services: PaymentService, StatsService, AuthService, LogService");

// ============================================
// MODULE EXPORTS
// ============================================

export {
    app,
    db,
    auth,
    analytics,
    firebaseConfig,
    COLLECTIONS,
    PaymentService,
    StatsService,
    AuthService,
    LogService,
    firebaseAPI
};

export default {
    app,
    db,
    auth,
    PaymentService,
    StatsService,
    AuthService,
    LogService,
    firebaseAPI
};
