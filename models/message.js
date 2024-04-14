'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Message extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Message.belongsTo(models.Session, {
        foreignKey: 'session_id',
        as: 'session'
      });
    }
  }
  Message.init({
    session_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
          model: 'Session',
          key: 'id'
      }
  },
    content: DataTypes.TEXT,
    type: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Message',
  });
  return Message;
};