/**
 * Firebase Configuration
 * Spectre Tech Limited Payment System
 * 
 * Centralized Firebase configuration - imported by all Firebase modules
 */

// Firebase Configuration
export const firebaseConfig = {
    apiKey: "AIzaSyB2CXyFin6LNLTXe4C_Dj8HrAkwIhbuQPs",
    authDomain: "spectre-payment.firebaseapp.com",
    projectId: "spectre-payment",
    storageBucket: "spectre-payment.firebasestorage.app",
    messagingSenderId: "384792827904",
    appId: "1:384792827904:web:4a08eed1fe885f9cab60e5",
    measurementId: "G-J0BZ9STKZ1"
};

// Collection names
export const COLLECTIONS = {
    PAYMENTS: 'payments',
    TRANSACTIONS: 'transactions',
    USERS: 'users',
    LOGS: 'logs',
    CALLBACKS: 'mpesa_callbacks'
};

export default firebaseConfig;
