'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Follower extends Model {
    static associate(models) {
      Follower.belongsTo(models.User, { foreignKey: 'followerId', as: 'follower' });
      Follower.belongsTo(models.User, { foreignKey: 'followingId', as: 'following' });
    }
  }

  Follower.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    followerId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    followingId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
      defaultValue: 'pending',
    },
  }, {
    sequelize,
    modelName: 'Follower',
    tableName: 'followers',
    paranoid: true,
  });

  return Follower;
};