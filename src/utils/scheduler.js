'use strict';

const cron = require('node-cron');
const { Op } = require('sequelize');
const { RefreshToken } = require('../models');

/**
 * Deletes all refresh tokens that are either:
 * - revoked  (isRevoked = true), OR
 * - expired  (expiresAt < now)
 *
 * Runs every day at 2:00 AM.
 */
const startScheduler = () => {
  cron.schedule('0 2 * * *', async () => {
    try {
      const deleted = await RefreshToken.destroy({
        where: {
          [Op.or]: [
            { isRevoked: true },
            { expiresAt: { [Op.lt]: new Date() } },
          ],
        },
      });
      console.log(`🧹 [Scheduler] Cleaned up ${deleted} expired/revoked refresh tokens`);
    } catch (err) {
      console.error('❌ [Scheduler] Token cleanup failed:', err.message);
    }
  });

  console.log('⏰ [Scheduler] Token cleanup job scheduled (daily at 2:00 AM)');
};

module.exports = { startScheduler };
