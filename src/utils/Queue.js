import Queue from 'bull';

import jobs from '../jobs/index.js';
import Redis from 'ioredis';


const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = process.env.REDIS_PORT || 6379;
const redisPassword = process.env.REDIS_PASSWORD;

const redisConfig = {
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
};


const queues = Object.values(jobs).map((job) => {
  const queueName = job.key; 
  console.log(`🏗️ Criando fila: ${queueName}`);
  
  return {
    bull: new Queue(queueName, {
      redis: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 50
      }
    }),
    name: job.key,
    handle: job.handle,
    options: job.options,
    fullName: queueName
  };
});


console.log('📡 Configuração Redis para Bull:', `${redisHost}:${redisPort}`);

console.log('📋 Filas disponíveis:', queues.map(q => `${q.name} (${q.fullName})`));

export default {
  queues,
  add(name, data) {
    try {
      const queue = this.queues.find((queue) => queue.name === name);

      console.log(`📋 Adicionando job ${name} à fila ${queue.fullName}`);
      return queue.bull.add(data, queue.options || {});
    } catch (error) {
      console.error(`❌ Erro ao adicionar job ${name}:`, error);
      throw error;
    }
  },
  process() {
    return this.queues.forEach((queue) => {
      console.log(`🔧 Configurando processador para fila: ${queue.name}`);
      
      queue.bull.process(queue.handle);
      console.log(`✅ Fila ${queue.name} está rodando`);

      queue.bull.on('failed', (job, error) => {
        console.error(`❌ Job falhou na fila ${queue.name}:`, error);
      });

      queue.bull.on('completed', (job, result) => {
        console.log(`✅ Job completado na fila ${queue.name}:`, result);
      });

      queue.bull.on('waiting', (jobId) => {
        console.log(`⏳ Job ${jobId} aguardando processamento na fila ${queue.name}`);
      });

      queue.bull.on('active', (job) => {
        console.log(`🔄 Job ${job.id} iniciado na fila ${queue.name}`);
      });

      queue.bull.on('ready', () => {
        console.log(`🔗 Fila ${queue.name} conectada ao Redis com sucesso`);
      });

      queue.bull.on('error', (error) => {
        console.error(`⚠️ Erro na conexão da fila ${queue.name}:`, error.message);
        console.error(`🔍 Código do erro: ${error.code}`);
        console.error(`🔍 Stack trace:`, error.stack?.split('\n')[0]);
      });
    });
  },
  
  async getStats() {
    const stats = {};
    for (const queue of this.queues) {
      const waiting = await queue.bull.getWaiting();
      const active = await queue.bull.getActive();
      const completed = await queue.bull.getCompleted();
      const failed = await queue.bull.getFailed();
      
      stats[queue.name] = {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length
      };
    }
    return stats;
  },

  async clean() {
    for (const queue of this.queues) {
      console.log(`🧹 Limpando fila ${queue.name}...`);
      
      await queue.bull.pause();
      

      const waiting = await queue.bull.getWaiting();
      const active = await queue.bull.getActive();
      
      for (const job of active) {
        await job.remove();
        console.log(`🗑️ Job ativo ${job.id} removido da fila ${queue.name}`);
      }
      
      for (const job of waiting) {
        await job.remove();
        console.log(`🗑️ Job aguardando ${job.id} removido da fila ${queue.name}`);
      }
      
      await queue.bull.clean(0, 'completed');
      await queue.bull.clean(0, 'failed');
      
      await queue.bull.resume();
      
      console.log(`✅ Fila ${queue.name} limpa completamente`);
    }
  }
};