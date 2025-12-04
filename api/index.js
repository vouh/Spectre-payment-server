/**
 * API Module Index - Central Export Point
 * Spectre Tech Limited Payment System
 * 
 * Import this file to access all API services
 * 
 * Structure:
 * - firebase-config.js: Firebase initialization and configuration
 * - payment-service.js: Payment CRUD operations
 * - stats-service.js: Dashboard statistics
 * - auth-service.js: Admin authentication
 * - mpesa-callback-handler.js: M-Pesa callback processing (server-side)
 */

// Re-export all services
export { default as firebaseConfig, db, auth, COLLECTIONS } from './firebase-config.js';
export { default as paymentService, PaymentService } from './payment-service.js';
export { default as statsService, StatsService } from './stats-service.js';
export { default as authService, AuthService } from './auth-service.js';

// Version info
export const API_VERSION = '1.0.0';
export const API_NAME = 'Spectre Tech Payment API';

console.log(`🔥 ${API_NAME} v${API_VERSION} loaded`);
