require('dotenv').config();

module.exports = {
  dev: {
    username: null,
    password: null,
    database: 'searchneu_dev',
    host: '127.0.0.1',
    dialect: 'postgres',
  },
  test: {
    username: null,
    password: null,
    database: 'searchneu_test',
    host: '127.0.0.1',
    dialect: 'postgres',
  },
  prod: {
    username: process.env.dbUsername,
    password: process.env.dbPassword,
    database: process.env.dbName,
    host: process.env.dbHost,
    dialect: 'postgres',
  },
};
