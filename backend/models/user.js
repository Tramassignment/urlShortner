const { Sequelize, DataTypes } = require('sequelize');
// const { v4: uuidv4 } = require('uuid'); 
const dotenv = require('dotenv');
const path = require('path');


dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DB_USERNAME = process.env.DB_USERNAME;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_HOST = process.env.DB_HOST;
const DB_NAME = process.env.DB_NAME
console.log(DB_NAME+"here")


const sequelize = new Sequelize(DB_NAME,DB_USERNAME,DB_PASSWORD, {
  dialect: 'mysql',
  host: DB_HOST,
});

const User = sequelize.define('user', {
  id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4
  },
  name: {
      type: Sequelize.STRING,
      allowNull: false
  },
  email: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
  },
  password: {
    type: Sequelize.STRING,
    allowNull: false
},
  tier: {
      type: Sequelize.INTEGER,
      defaultValue: 1  
  },
  requestCount: {
    type: Sequelize.INTEGER,
    defaultValue: 0
}
},{
  tableName: 'user',
  timestamps: false,
});

module.exports = { User };