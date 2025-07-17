import { processVideoToHLS } from '../services/videoProcessor.js';
import db from '../models/index.js';

const updateVideoStatus = async (videoId, status) => {
  try {
    const { Video } = db;
    await Video.update(
      { status },
      { where: { id: videoId } }
    );
    console.log(`📝 Status do vídeo ${videoId} atualizado para: ${status}`);
  } catch (error) {
    console.error('❌ Erro ao atualizar status do vídeo:', error);
  }
};

export default {
  key: 'ProcessVideo',
  async handle({ data }) {
    console.log(`🔥 PROCESSADOR CHAMADO! Job ProcessVideo`);
    const { videoId, videoPath, thumbnailPath } = data;
    
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
      
      return JSON.stringify({ success: true, videoId });
      
    } catch (error) {
      console.error(`❌ Erro ao processar vídeo ${videoId}:`, error);
      
      
      await updateVideoStatus(videoId, 'failed');
      
      throw error;
    }
  },
  options: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: 10,
    removeOnFail: 5
  }
};