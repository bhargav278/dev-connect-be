"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // associations will come later
      // One User can have many RefreshTokens (multiple devices/sessions)
      User.hasMany(models.RefreshToken, {
        foreignKey: "userId",
        as: "refreshTokens",
      });

      // People this user is following
      User.belongsToMany(models.User, {
        through: models.Follower,
        as: "following",
        foreignKey: "followerId",
        otherKey: "followingId",
      });

      // People following this user
      User.belongsToMany(models.User, {
        through: models.Follower,
        as: "followers",
        foreignKey: "followingId",
        otherKey: "followerId",
      });

      User.hasMany(models.Post, {
        foreignKey: "userId",
        as: "posts",
        onDelete: "CASCADE",
      });
      User.hasMany(models.Like, {
        foreignKey: "userId",
        as: "likes",
        onDelete: "CASCADE",
      });
      User.hasMany(models.Comment, {
        foreignKey: "userId",
        as: "comments",
        onDelete: "CASCADE",
      });

      User.hasMany(models.Notification, {
        foreignKey: 'userId',
        as: 'notifications',
        onDelete: 'CASCADE',
      });
    }

    /**
     * Override toJSON to strip password from any JSON response.
     *
     * @returns {object} User data without password
     */
    toJSON() {
      const values = { ...this.get() };
      delete values.password;
      return values;
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      bio: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      avatar: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      role: {
        type: DataTypes.ENUM("user", "admin"),
        defaultValue: "user",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      isPrivate: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "User",
      tableName: "users",
      paranoid: true,
    },
  );

  return User;
};
