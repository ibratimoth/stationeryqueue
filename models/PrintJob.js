const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PrintJob = sequelize.define('PrintJob', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  referenceNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  originalFileName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  storedFileName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  filePath: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fileType: {
    type: DataTypes.ENUM('pdf', 'docx', 'xlsx'),
    allowNull: false
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  pageCount: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('unhandled', 'handled'),
    defaultValue: 'unhandled',
    allowNull: false
  },
  handledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Optional foreign key linking which admin handled the job
  handledByUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'print_jobs',
  timestamps: true,
  indexes: [
    { fields: ['referenceNumber'], unique: true },
    { fields: ['status'] },
    { fields: ['createdAt'] }
  ]
});

module.exports = PrintJob;