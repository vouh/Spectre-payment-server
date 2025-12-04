/**
 * Firebase Configuration & Database Client
 * Spectre Tech Limited Payment System
 * 
 * Centralized Firebase configuration - import this in all modules
 * that need Firebase access
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
let app;
let db;
let auth;
let analytics;

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    
    // Analytics only in browser context
    if (typeof window !== 'undefined') {
        analytics = getAnalytics(app);
    }
    
    console.log("🔥 Firebase initialized successfully");
} catch (error) {
    console.error("❌ Firebase initialization error:", error);
}

// Collection names
const COLLECTIONS = {
    PAYMENTS: 'payments',
    TRANSACTIONS: 'transactions',
    USERS: 'users',
    LOGS: 'logs',
    CALLBACKS: 'mpesa_callbacks'
};

// Export everything needed
export {
    app,
    db,
    auth,
    analytics,
    COLLECTIONS,
    // Firestore methods
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
    Timestamp,
    // Auth methods
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
};

export default { app, db, auth, COLLECTIONS };
