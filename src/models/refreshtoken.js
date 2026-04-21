'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RefreshToken extends Model {
    static associate(models) {
      // Each RefreshToken belongs to one User
      RefreshToken.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }

    /**
     * Check if the token is still usable.
     * Must NOT be revoked AND must NOT be expired.
     *
     * @returns {boolean}
     */
    isValid() {
      return !this.isRevoked && new Date() < new Date(this.expiresAt);
    }
  }

  RefreshToken.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    token: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    isRevoked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    sequelize,
    modelName: 'RefreshToken',
    tableName: 'refresh_tokens',
  });

  return RefreshToken;
};
