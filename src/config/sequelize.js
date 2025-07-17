const { Sequelize } = require('sequelize');
const config = require('./database.js');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    pool: dbConfig.pool,
    define: dbConfig.define
  }
);


const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexão com banco de dados estabelecida com sucesso.');
  } catch (error) {
    console.error('Erro ao conectar com o banco de dados:', error);
    throw error;
  }
};

module.exports = { sequelize, testConnection };
