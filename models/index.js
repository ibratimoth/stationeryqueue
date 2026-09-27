const sequelize = require('../config/database');
const User = require('./User');
const PrintJob = require('./PrintJob');
const DailyCounter = require('./DailyCounter');

// Define Relationships & Associations
// An Admin (User) can process/handle multiple PrintJobs
User.hasMany(PrintJob, {
  foreignKey: 'handledByUserId',
  as: 'handledJobs',
  onDelete: 'SET NULL'
});

PrintJob.belongsTo(User, {
  foreignKey: 'handledByUserId',
  as: 'handler'
});

module.exports = {
  sequelize,
  User,
  PrintJob,
  DailyCounter
};