import db from '../models/index.js';

const { Video, Billing } = db;
const { Op } = db.Sequelize;

const calcularFaturamentoo = async (videoId, durationInSeconds) => {
  try {
    
    const exactDurationInSeconds = parseFloat(durationInSeconds);
    
    
    
    const costPerMinute = parseFloat(process.env.COST_PER_MINUTE) || 0.50;
    
    
    const durationInMinutes = exactDurationInSeconds / 60.0;
    const roundedMinutes = Math.ceil(durationInMinutes);
    const amount = roundedMinutes * costPerMinute;

    
    const video = await Video.findByPk(videoId, {
      attributes: ['user_id']
    });

    if (!video) {
      throw new Error(`Vídeo ${videoId} não encontrado`);
    }

    const userId = video.user_id;

    
    await Billing.create({
      user_id: userId,
      video_id: videoId,
      minutes_processed: roundedMinutes,
      amount: amount
    });

    console.log(`Faturamento registrado: Vídeo ${videoId}, ${exactDurationInSeconds} segundos (${roundedMinutes} minutos), $${amount.toFixed(2)} ($${costPerMinute}/minuto)`);

    return {
      videoId,
      durationInSeconds: exactDurationInSeconds,
      durationInMinutes: durationInMinutes,
      roundedMinutes: roundedMinutes,
      amount: amount,
      costPerMinute: costPerMinute,
      userId
    };

  } catch (error) {
    console.error(`Erro ao calcular faturamento para vídeo ${videoId}:`, error);
    throw error;
  }
};

const obterFaturamentoUsuariio = async (userId) => {
  try {
    const result = await Billing.sum('amount', {
      where: { user_id: userId }
    });

    
    const total = parseFloat(result || 0);

    return {
      total: total,
      currency: 'USD'
    };

  } catch (error) {
    console.error(`Erro ao obter faturamento do usuário ${userId}:`, error);
    throw error;
  }
};

export { calcularFaturamentoo as calculateBilling, obterFaturamentoUsuariio as getUserBilling };