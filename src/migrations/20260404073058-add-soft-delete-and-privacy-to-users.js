'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    // Soft delete for users
    await queryInterface.addColumn('users', 'deletedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    // Private/public account toggle
    await queryInterface.addColumn('users', 'isPrivate', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'deletedAt');
    await queryInterface.removeColumn('users', 'isPrivate');
  }
};