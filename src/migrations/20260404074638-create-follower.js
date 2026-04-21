'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('followers', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      followerId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      followingId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      status: {
        type: Sequelize.ENUM('pending', 'accepted', 'rejected'),
        defaultValue: 'pending',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,   // null = active, timestamp = soft deleted
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('followers');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_followers_status";');
  }
};