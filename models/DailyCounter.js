const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DailyCounter = sequelize.define('DailyCounter', {
  date: {
    type: DataTypes.DATEONLY,
    primaryKey: true,
    allowNull: false
  },
  lastSerial: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  }
}, {
  tableName: 'daily_counters',
  timestamps: false
});

module.exports = DailyCounter;