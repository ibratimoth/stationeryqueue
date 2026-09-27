const { DailyCounter, sequelize } = require('../models');

/**
 * Generates daily tracking numbers formatted as YYMMDD-XXXX (e.g. 260922-0001)
 */
async function generateReferenceNumber() {
  const transaction = await sequelize.transaction();
  try {
    const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

    // Lock row for update to ensure thread safety
    let counter = await DailyCounter.findByPk(today, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!counter) {
      counter = await DailyCounter.create(
        { date: today, lastSerial: 0 },
        { transaction }
      );
    }

    const nextSerial = counter.lastSerial + 1;
    await counter.update({ lastSerial: nextSerial }, { transaction });
    await transaction.commit();

    // Format date components
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const serialStr = String(nextSerial).padStart(4, '0');

    return `${yy}${mm}${dd}-${serialStr}`;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

module.exports = { generateReferenceNumber };