'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    static associate(models) {
      Notification.belongsTo(models.User, { foreignKey: 'userId', as: 'recipient' });
      Notification.belongsTo(models.User, { foreignKey: 'actorId', as: 'actor' });
    }
  }

  Notification.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    actorId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM('like', 'comment', 'follow', 'follow_request', 'follow_accept'),
      allowNull: false,
    },
    referenceId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    message: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    sequelize,
    modelName: 'Notification',
    tableName: 'notifications',
    paranoid: true,
  });

  return Notification;
};