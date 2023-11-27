const { Sequelize, DataTypes } = require('sequelize');
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
const RequestLog = sequelize.define('request_log', {
    id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
    },
    userId: {
        type: Sequelize.UUID,
        references: {
            model: 'user',
            key: 'id'
        }
    },
    requestType: {
        type: Sequelize.STRING,
        allowNull: false
    },
    timestamp: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
    }
},{
    tableName: 'requestLog',
    timestamps: false,
  });
  
  module.exports = { RequestLog };
