import Joi from 'joi';
import path from 'path';
import fs from 'fs';
import db from '../models/index.js';
import Queue from '../utils/Queue.js';
import redisClient from '../config/redis.js';

const { Video, User, Billing } = db;

const uploadSchema = Joi.object({
  title: Joi.string().required().max(255),
  description: Joi.string().optional().max(1000),
  is_public: Joi.boolean().optional().default(false)
});

const updateVideoSchema = Joi.object({
  title: Joi.string().required().max(255).trim(),
  description: Joi.string().optional().max(1000).trim(),
  is_public: Joi.boolean().optional()
});

const enviarVideio = async (req, res) => {
  try {
    if (!req.files || !req.files.video || !req.files.video[0]) {
      return res.status(400).json({ error: 'Arquivo de vídeo é obrigatório' });
    }

    const { error, value } = uploadSchema.validate(req.body);
    
    if (error) {
      if (req.files.video && req.files.video[0]) fs.unlinkSync(req.files.video[0].path);
      if (req.files.thumbnail && req.files.thumbnail[0]) fs.unlinkSync(req.files.thumbnail[0].path);
      return res.status(400).json({ error: error.details[0].message });
    }

    const { title, description, is_public } = value;
    const videoFile = req.files.video[0];
    const thumbnailFile = req.files.thumbnail ? req.files.thumbnail[0] : null;

    const video = await Video.create({
      user_id: req.user.id,
      title,
      description,
      is_public,
      original_filename: videoFile.originalname,
      file_path: videoFile.path,
      thumbnail_path: thumbnailFile ? thumbnailFile.path : null,
      status: 'processing'
    });

    
    try {
      Queue.add('ProcessVideo', {
        videoId: video.id,
        videoPath: videoFile.path,
        thumbnailPath: thumbnailFile?.path
      });
      console.log(`Vídeo ${video.id} adicionado à fila de processamento`);
    } catch (queueError) {
      console.error('Erro ao adicionar à fila:', queueError);
      
      await Video.update(
        { status: 'failed' },
        { where: { id: video.id } }
      );
    }

    

    res.status(201).json({
      message: 'Vídeo enviado com sucesso',
      video: {
        id: video.id,
        title: video.title,
        status: video.status
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    if (req.files?.video?.[0]) fs.unlinkSync(req.files.video[0].path);
    if (req.files?.thumbnail?.[0]) fs.unlinkSync(req.files.thumbnail[0].path);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const obterVideios = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = (page - 1) * limit;

    const cacheKey = `videos_user_${req.user.id}_page_${page}_limit_${limit}`;
    
    
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    } catch (cacheError) {
      console.warn('Cache error:', cacheError);
    }

    
    const { rows: videos, count: total } = await Video.findAndCountAll({
      where: { user_id: req.user.id },
      attributes: [
        'id', 'title', 'description', 'status', 'thumbnail_path', 
        'original_resolution', 'available_resolutions', 'duration', 'is_public', 'created_at'
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    const totalPages = Math.ceil(total / limit);

    const response = {
      videos,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };

    
    try {
      await redisClient.setEx(cacheKey, 300, JSON.stringify(response));
    } catch (cacheError) {
      console.warn('Cache save error:', cacheError);
    }

    res.json(response);

  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const obterVideio = async (req, res) => {
  try {
    const videoId = req.params.id;
    
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(videoId)) {
      return res.status(400).json({ error: 'ID de vídeo inválido' });
    }

    const video = await Video.findOne({
      where: { 
        id: videoId, 
        user_id: req.user.id 
      },
      attributes: [
        'id', 'title', 'description', 'hls_path', 'thumbnail_path', 
        'duration', 'original_resolution', 'available_resolutions', 
        'status', 'is_public', 'created_at', 'updated_at'
      ]
    });

    if (!video) {
      return res.status(404).json({ error: 'Vídeo não encontrado' });
    }

    res.json(video);

  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};


const getPublicVideos = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 12, 50);
    const offset = (page - 1) * limit;

    const cacheKey = `public_videos_page_${page}_limit_${limit}`;
    
    
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    } catch (cacheError) {
      console.warn('Cache error:', cacheError);
    }

    
    const { rows: videos, count: total } = await Video.findAndCountAll({
      where: { 
        is_public: true,
        status: 'completed'
      },
      attributes: [
        'id', 'title', 'description', 'thumbnail_path', 
        'duration', 'original_resolution', 'available_resolutions', 'created_at'
      ],
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username']
      }],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    const totalPages = Math.ceil(total / limit);

    const response = {
      videos,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };

    
    try {
      await redisClient.setEx(cacheKey, 600, JSON.stringify(response));
    } catch (cacheError) {
      console.warn('Cache save error:', cacheError);
    }

    res.json(response);

  } catch (error) {
    console.error('Get public videos error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};


const getPublicVideo = async (req, res) => {
  try {
    const videoId = req.params.id;
    
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(videoId)) {
      return res.status(400).json({ error: 'ID de vídeo inválido' });
    }

    const video = await Video.findOne({
      where: { 
        id: videoId, 
        is_public: true,
        status: 'completed'
      },
      attributes: [
        'id', 'title', 'description', 'hls_path', 'thumbnail_path', 
        'duration', 'original_resolution', 'available_resolutions', 'created_at'
      ],
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username']
      }]
    });

    if (!video) {
      return res.status(404).json({ error: 'Vídeo não encontrado' });
    }

    res.json(video);

  } catch (error) {
    console.error('Get public video error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};


const getVideoOrPublic = async (req, res) => {
  try {
    const videoId = req.params.id;
    
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(videoId)) {
      return res.status(400).json({ error: 'ID de vídeo inválido' });
    }

    let whereClause = { id: videoId };
    
    
    if (!req.user) {
      whereClause.is_public = true;
      whereClause.status = 'completed';
    } else {
      
      whereClause = {
        id: videoId,
        [db.Sequelize.Op.or]: [
          { user_id: req.user.id },
          { is_public: true, status: 'completed' }
        ]
      };
    }

    const video = await Video.findOne({
      where: whereClause,
      attributes: [
        'id', 'title', 'description', 'hls_path', 'thumbnail_path', 
        'duration', 'original_resolution', 'available_resolutions', 
        'status', 'is_public', 'created_at', 'updated_at'
      ],
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username']
      }]
    });

    if (!video) {
      return res.status(404).json({ error: 'Vídeo não encontrado' });
    }

    res.json(video);

  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};


const atualizarVideio = async (req, res) => {
  try {
    const videoId = req.params.id;
    
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(videoId)) {
      return res.status(400).json({ error: 'ID de vídeo inválido' });
    }

    
    const { error, value } = updateVideoSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Dados inválidos', 
        details: error.details.map(d => d.message) 
      });
    }

    
    const video = await Video.findOne({
      where: { 
        id: videoId, 
        user_id: req.user.id 
      }
    });

    if (!video) {
      return res.status(404).json({ error: 'Vídeo não encontrado ou não pertence ao usuário' });
    }

    
    const updatedData = {};
    if (value.title !== undefined) updatedData.title = value.title;
    if (value.description !== undefined) updatedData.description = value.description;
    if (value.is_public !== undefined) updatedData.is_public = value.is_public;

    await Video.update(updatedData, {
      where: { id: videoId }
    });

    
    const updatedVideo = await Video.findOne({
      where: { id: videoId },
      attributes: [
        'id', 'title', 'description', 'hls_path', 'thumbnail_path', 
        'duration', 'original_resolution', 'available_resolutions', 
        'status', 'is_public', 'created_at', 'updated_at'
      ],
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username']
      }]
    });

    
    try {
      const cacheKeys = [
        `cache_/api/videos?page=1&limit=10_${req.user.id}`,
        `cache_/api/videos/${videoId}_${req.user.id}`,
        'public_videos_page_1_limit_10'
      ];
      
      await Promise.all(cacheKeys.map(key => redisClient.del(key)));
    } catch (cacheError) {
      console.warn('Cache invalidation error:', cacheError);
    }

    res.json({
      message: 'Vídeo atualizado com sucesso',
      video: updatedVideo
    });

  } catch (error) {
    console.error('Update video error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export { enviarVideio as uploadVideo, obterVideios as getVideos, obterVideio as getVideo, getPublicVideos, getPublicVideo, getVideoOrPublic, atualizarVideio as updateVideo };