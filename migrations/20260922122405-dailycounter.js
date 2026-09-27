'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('daily_counters', {
      date: {
        type: Sequelize.DATEONLY,
        primaryKey: true,
        allowNull: false
      },
      lastSerial: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('daily_counters');
  }
};