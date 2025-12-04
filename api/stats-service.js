/**
 * Statistics Service - Dashboard Statistics Operations
 * Spectre Tech Limited Payment System
 * 
 * Handles all statistics and analytics for the admin dashboard
 */

import {
    db,
    COLLECTIONS,
    collection,
    getDocs,
    query,
    where,
    orderBy,
    limit
} from './firebase-config.js';

/**
 * Statistics Service Class
 */
class StatsService {
    constructor() {
        this.paymentsCollection = COLLECTIONS.PAYMENTS;
    }

    /**
     * Get dashboard statistics
     * @returns {Object} - Dashboard stats (total, completed, failed, revenue)
     */
    async getDashboardStats() {
        try {
            const querySnapshot = await getDocs(collection(db, this.paymentsCollection));
            
            let total = 0;
            let completed = 0;
            let failed = 0;
            let revenue = 0;
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                total++;
                
                if (data.status === 'completed' || data.status === 'success') {
                    completed++;
                    // Add to revenue
                    const amount = parseFloat(data.amountRaw || data.amount || 0);
                    if (!isNaN(amount)) {
                        revenue += amount;
                    }
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
            console.error("❌ Error getting dashboard stats:", error);
            return { 
                success: false, 
                error: error.message,
                data: { total: 0, completed: 0, failed: 0, pending: 0, revenue: 0 }
            };
        }
    }

    /**
     * Get category breakdown
     * @returns {Object} - Category stats
     */
    async getCategoryStats() {
        try {
            const querySnapshot = await getDocs(collection(db, this.paymentsCollection));
            
            const categories = {};
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const category = data.category || data.reason || 'Other';
                
                if (!categories[category]) {
                    categories[category] = {
                        count: 0,
                        revenue: 0
                    };
                }
                
                categories[category].count++;
                
                if (data.status === 'completed' || data.status === 'success') {
                    const amount = parseFloat(data.amountRaw || data.amount || 0);
                    if (!isNaN(amount)) {
                        categories[category].revenue += amount;
                    }
                }
            });
            
            return { success: true, data: categories };
        } catch (error) {
            console.error("❌ Error getting category stats:", error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get daily revenue for the last N days
     * @param {number} days - Number of days to look back
     * @returns {Object} - Daily revenue data
     */
    async getDailyRevenue(days = 7) {
        try {
            const querySnapshot = await getDocs(collection(db, this.paymentsCollection));
            
            const dailyData = {};
            const today = new Date();
            
            // Initialize days
            for (let i = 0; i < days; i++) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const dateKey = date.toISOString().split('T')[0];
                dailyData[dateKey] = { count: 0, revenue: 0 };
            }
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const createdAt = data.createdAt || data.date;
                
                if (createdAt) {
                    const dateKey = new Date(createdAt).toISOString().split('T')[0];
                    
                    if (dailyData[dateKey]) {
                        dailyData[dateKey].count++;
                        
                        if (data.status === 'completed' || data.status === 'success') {
                            const amount = parseFloat(data.amountRaw || data.amount || 0);
                            if (!isNaN(amount)) {
                                dailyData[dateKey].revenue += amount;
                            }
                        }
                    }
                }
            });
            
            return { success: true, data: dailyData };
        } catch (error) {
            console.error("❌ Error getting daily revenue:", error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get recent transactions for dashboard
     * @param {number} count - Number of recent transactions
     * @returns {Array} - Recent transactions
     */
    async getRecentTransactions(count = 10) {
        try {
            const q = query(
                collection(db, this.paymentsCollection),
                orderBy("createdAt", "desc"),
                limit(count)
            );
            
            const querySnapshot = await getDocs(q);
            const transactions = [];
            
            querySnapshot.forEach((doc) => {
                transactions.push({ id: doc.id, ...doc.data() });
            });
            
            return { success: true, data: transactions };
        } catch (error) {
            console.error("❌ Error getting recent transactions:", error);
            return { success: false, error: error.message, data: [] };
        }
    }
}

// Create and export singleton instance
const statsService = new StatsService();

export { StatsService };
export default statsService;
