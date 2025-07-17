import Queue from 'bull';
import { processVideoToHLS } from './videoProcessor.js';
import db from '../models/index.js';


const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  lazyConnect: true
};


const videoQueue = new Queue('video processing', {
  redis: redisConfig
});


videoQueue.process('process-video', 1, async (job) => {
  console.log(`🔥 PROCESSADOR CHAMADO! Job ID: ${job.id}`);
  const { videoId, videoPath, thumbnailPath } = job.data;
  
  console.log(`🎬 Iniciando processamento do vídeo: ${videoId}`);
  console.log(`📁 Arquivo de vídeo: ${videoPath}`);
  console.log(`🖼️ Thumbnail: ${thumbnailPath}`);
  
  try {
    
    console.log(`🔄 Atualizando status para 'processing'...`);
    await updateVideoStatus(videoId, 'processing');
    
    
    console.log(`⚙️ Iniciando conversão HLS...`);
    await processVideoToHLS(videoId, videoPath, thumbnailPath);
    
    
    console.log(`✅ Conversão finalizada, atualizando status...`);
    await updateVideoStatus(videoId, 'completed');
    
    console.log(`✅ Vídeo processado com sucesso: ${videoId}`);
    
    return { success: true, videoId };
    
  } catch (error) {
    console.error(`❌ Erro ao processar vídeo ${videoId}:`, error);
    
    
    await updateVideoStatus(videoId, 'failed');
    
    throw error;
  }
});


const updateVideoStatus = async (videoId, status) => {
  try {
    const { Video } = db;
    await Video.update(
      { status },
      { where: { id: videoId } }
    );
  } catch (error) {
    console.error('Erro ao atualizar status do vídeo:', error);
  }
};


const addVideoToQueue = async (videoId, videoPath, thumbnailPath = null) => {
  try {
    const job = await videoQueue.add('process-video', {
      videoId,
      videoPath,
      thumbnailPath
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: 10,
      removeOnFail: 5
    });
    
    console.log(`📋 Vídeo adicionado à fila: ${videoId} (Job ID: ${job.id})`);
    return job;
    
  } catch (error) {
    console.error('Erro ao adicionar vídeo à fila:', error);
    throw error;
  }
};


videoQueue.on('completed', (job, result) => {
  console.log(`✅ Job ${job.id} completado para vídeo: ${result.videoId}`);
});

videoQueue.on('failed', (job, err) => {
  console.log(`❌ Job ${job.id} falhou:`, err.message);
});

videoQueue.on('progress', (job, progress) => {
  console.log(`🔄 Job ${job.id} progresso: ${progress}%`);
});


videoQueue.on('ready', () => {
  console.log('🔗 Queue conectada ao Redis');
});

videoQueue.on('error', (error) => {
  console.error('⚠️  Erro na conexão da fila:', error.message);
});


videoQueue.on('waiting', (jobId) => {
  console.log(`⏳ Job ${jobId} aguardando processamento`);
});


console.log('📡 Configuração Redis para Bull:', {
  host: redisConfig.host,
  port: redisConfig.port,
  hasPassword: !!redisConfig.password
});


console.log('🔧 Processador de video registrado com concorrência 1');


const getQueueStats = async () => {
  const waiting = await videoQueue.getWaiting();
  const active = await videoQueue.getActive();
  const completed = await videoQueue.getCompleted();
  const failed = await videoQueue.getFailed();
  
  return {
    waiting: waiting.length,
    active: active.length,
    completed: completed.length,
    failed: failed.length
  };
};


const cleanQueue = async () => {
  try {
    console.log('🧹 Limpando fila...');
    
    
    await videoQueue.pause();
    
    
    const waiting = await videoQueue.getWaiting();
    const active = await videoQueue.getActive();
    const completed = await videoQueue.getCompleted();
    const failed = await videoQueue.getFailed();
    
    console.log(`📊 Jobs encontrados - Waiting: ${waiting.length}, Active: ${active.length}, Completed: ${completed.length}, Failed: ${failed.length}`);
    
    
    for (const job of active) {
      await job.remove();
      console.log(`🗑️ Job ativo ${job.id} removido`);
    }
    
    
    for (const job of waiting) {
      await job.remove();
      console.log(`🗑️ Job aguardando ${job.id} removido`);
    }
    
    
    await videoQueue.clean(0, 'completed');
    await videoQueue.clean(0, 'failed');
    
    
    await videoQueue.resume();
    
    console.log('✅ Fila limpa completamente');
  } catch (error) {
    console.error('❌ Erro ao limpar fila:', error);
    throw error;
  }
};

export {
  videoQueue,
  addVideoToQueue,
  getQueueStats,
  cleanQueue
};