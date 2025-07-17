import 'dotenv/config';
import { sequelize } from './models/index.js';
import redisClient from './config/redis.js';
import Queue from './utils/Queue.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const waitForService = async (serviceName, checkFunction, maxRetries = 30) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await checkFunction();
      console.log(`✅ ${serviceName} conectado com sucesso`);
      return;
    } catch (error) {
      console.log(`⏳ Aguardando ${serviceName}... (tentativa ${i + 1}/${maxRetries})`);
      if (i === maxRetries - 1) {
        throw new Error(`❌ ${serviceName} não disponível após ${maxRetries} tentativas`);
      }
      await sleep(2000);
    }
  }
};

const initializeWorker = async () => {
  try {
    console.log('🔧 Iniciando Worker para processamento de filas...');
    
    // Aguardar Redis
    await waitForService('Redis', async () => {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
    });
    console.log('Connected to Redis');
    
    // Aguardar PostgreSQL
    await waitForService('PostgreSQL', async () => {
      await sequelize.authenticate();
    });
    console.log('Conexão com banco de dados estabelecida com sucesso.');
    
    // Inicializar processamento das filas
    console.log('🚀 Iniciando processamento das filas...');
    Queue.process();
    
    console.log('✅ Worker inicializado com sucesso!');
    console.log(`📋 Filas sendo processadas: ${Queue.queues.length}`);
    
    Queue.queues.forEach((queue, index) => {
      console.log(`${index + 1}. ${queue.name} (${queue.fullName})`);
    });
    
    // Manter o processo vivo
    process.on('SIGINT', async () => {
      console.log('🛑 Recebido SIGINT, finalizando worker...');
      
      // Pausar todas as filas
      for (const queue of Queue.queues) {
        await queue.bull.pause();
        console.log(`⏸️ Fila ${queue.name} pausada`);
      }
      
      // Fechar conexões
      await redisClient.quit();
      await sequelize.close();
      
      console.log('✅ Worker finalizado com sucesso');
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('🛑 Recebido SIGTERM, finalizando worker...');
      
      // Pausar todas as filas
      for (const queue of Queue.queues) {
        await queue.bull.pause();
        console.log(`⏸️ Fila ${queue.name} pausada`);
      }
      
      // Fechar conexões
      await redisClient.quit();
      await sequelize.close();
      
      console.log('✅ Worker finalizado com sucesso');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Erro ao inicializar worker:', error);
    process.exit(1);
  }
};

initializeWorker();