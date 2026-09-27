'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Ensure UUID extension exists for PostgreSQL
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    await queryInterface.createTable('print_jobs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false
      },
      referenceNumber: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      originalFileName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      storedFileName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      filePath: {
        type: Sequelize.STRING,
        allowNull: false
      },
      fileType: {
        type: Sequelize.ENUM('pdf', 'docx', 'xlsx'),
        allowNull: false
      },
      fileSize: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      pageCount: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('unhandled', 'handled'),
        defaultValue: 'unhandled',
        allowNull: false
      },
      handledAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('print_jobs', ['referenceNumber']);
    await queryInterface.addIndex('print_jobs', ['status']);
    await queryInterface.addIndex('print_jobs', ['createdAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('print_jobs');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_print_jobs_fileType";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_print_jobs_status";');
  }
};