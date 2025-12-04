/**
 * Authentication Service - Admin Authentication
 * Spectre Tech Limited Payment System
 * 
 * Handles admin authentication and session management
 */

import {
    auth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from './firebase-config.js';

/**
 * Authentication Service Class
 */
class AuthService {
    constructor() {
        this.currentUser = null;
        this.authStateCallbacks = [];
    }

    /**
     * Initialize auth state listener
     */
    init() {
        onAuthStateChanged(auth, (user) => {
            this.currentUser = user;
            this.authStateCallbacks.forEach(callback => callback(user));
        });
    }

    /**
     * Sign in with email and password
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Object} - Result with user data or error
     */
    async login(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return {
                success: true,
                user: {
                    uid: userCredential.user.uid,
                    email: userCredential.user.email,
                    displayName: userCredential.user.displayName
                }
            };
        } catch (error) {
            console.error("❌ Login error:", error);
            
            let message = 'Login failed. Please try again.';
            
            switch (error.code) {
                case 'auth/invalid-email':
                    message = 'Invalid email address';
                    break;
                case 'auth/user-disabled':
                    message = 'This account has been disabled';
                    break;
                case 'auth/user-not-found':
                    message = 'No account found with this email';
                    break;
                case 'auth/wrong-password':
                    message = 'Incorrect password';
                    break;
                case 'auth/too-many-requests':
                    message = 'Too many failed attempts. Please try again later.';
                    break;
                case 'auth/invalid-credential':
                    message = 'Invalid email or password';
                    break;
            }

            return { success: false, error: message, code: error.code };
        }
    }

    /**
     * Sign out current user
     * @returns {Object} - Result
     */
    async logout() {
        try {
            await signOut(auth);
            return { success: true };
        } catch (error) {
            console.error("❌ Logout error:", error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get current user
     * @returns {Object|null} - Current user or null
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Check if user is logged in
     * @returns {boolean} - Is logged in
     */
    isLoggedIn() {
        return this.currentUser !== null;
    }

    /**
     * Register auth state change callback
     * @param {Function} callback - Callback function
     */
    onAuthStateChange(callback) {
        this.authStateCallbacks.push(callback);
        
        // Call immediately with current state
        if (this.currentUser !== undefined) {
            callback(this.currentUser);
        }
    }

    /**
     * Require authentication - redirect to login if not authenticated
     * @param {string} loginUrl - Login page URL
     */
    requireAuth(loginUrl = 'login.html') {
        onAuthStateChanged(auth, (user) => {
            if (!user) {
                window.location.href = loginUrl;
            }
        });
    }
}

// Create and export singleton instance
const authService = new AuthService();
authService.init();

export { AuthService };
export default authService;
