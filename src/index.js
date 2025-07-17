import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';

import authRoutes from './routes/auth.js';
import videoRoutes from './routes/videos.js';
import billingRoutes from './routes/billing.js';
import redisClient from './config/redis.js';
import { sequelize } from './models/index.js';
import Queue from './utils/Queue.js';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter.js';
import { ExpressAdapter } from '@bull-board/express';
import basicAuth from 'express-basic-auth';

const __filename = fileURLToPath(import.meta.url);

const app = express();
const PORT = process.env.PORT || 3033;


app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "*"], 
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      mediaSrc: ["'self'", "*"], 
      objectSrc: ["'none'"],
      frameSrc: ["'self'"]
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:8081', 'http://localhost:3000', 'http://ww8coo8coso4ck44ck8gsoow.31.97.166.190.sslip.io'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Authorization', 'Range', 'Accept'],
  exposedHeaders: ['Content-Range', 'Content-Length', 'Accept-Ranges']
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const uploadDir = process.env.UPLOAD_PATH || './uploads';
const processedDir = process.env.PROCESSED_PATH || './processed';

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(processedDir)) {
  fs.mkdirSync(processedDir, { recursive: true });
}


const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

const bullBoardUser = process.env.BULL_BOARD_USER || 'admin';
const bullBoardPassword = process.env.BULL_BOARD_PASSWORD || 'password';



const initializeServices = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    console.log('Connected to Redis');
    
    await sequelize.authenticate();
    console.log('Conexão com banco de dados estabelecida com sucesso.');
    
    
    await sequelize.sync({ alter: false });
    console.log('Modelos sincronizados com o banco de dados.');
    
    
    console.log('🔧 Configurando Bull Board Dashboard...');
    console.log(`📋 Filas disponíveis para Bull Board: ${Queue.queues.length}`);
    
    Queue.queues.forEach((queue, index) => {
      console.log(`${index + 1}. ${queue.name} (${queue.fullName})`);
    });
    
    const bullAdapters = Queue.queues.map((queue) => new BullAdapter(queue.bull));
    const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
      queues: bullAdapters,
      serverAdapter: serverAdapter,
    });
    
    console.log('✅ Bull Board Dashboard configurado');
    
  } catch (error) {
    console.error('Erro ao inicializar serviços:', error);
    process.exit(1);
  }
};

initializeServices();



app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Panda Video API Documentation'
}));

app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/billing', billingRoutes);


/**
 * @swagger
 * /admin/queues:
 *   get:
 *     tags: [Sistema]
 *     summary: Bull Board Dashboard
 *     description: |
 *       Interface web para monitoramento das filas de processamento de vídeo.
 *       
 *       **Acesso:**
 *       - Usuário: `admin` (configurável via BULL_BOARD_USER)
 *       - Senha: `password` (configurável via BULL_BOARD_PASSWORD)
 *       
 *       **Funcionalidades:**
 *       - Monitoramento de filas de processamento
 *       - Visualização de jobs pendentes, ativos e completados
 *       - Interface para retry e limpeza de jobs
 *       - Métricas de performance em tempo real
 *       - Logs detalhados de processamento
 *     security:
 *       - basicAuth: []
 *     responses:
 *       200:
 *         description: Dashboard carregado com sucesso
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: Interface web do Bull Board
 *       401:
 *         description: Credenciais inválidas
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: Prompt de autenticação HTTP Basic
 *     externalDocs:
 *       description: Documentação do Bull Board
 *       url: https://github.com/bee-queue/bull-board
 */
app.use(
  '/admin/queues',
  basicAuth({
    users: { [bullBoardUser]: bullBoardPassword },
    challenge: true
  }),
  serverAdapter.getRouter()
);

app.use('/processed', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Range, Content-Length');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

/**
 * @swagger
 * /processed/{videoId}/{file}:
 *   get:
 *     tags: [Sistema]
 *     summary: Servir arquivos processados
 *     description: |
 *       Serve arquivos HLS processados (.m3u8, .ts) e thumbnails.
 *       
 *       **Tipos de arquivo:**
 *       - `master.m3u8` - Playlist principal HLS
 *       - `360p.m3u8` - Playlist da resolução 360p
 *       - `360p_000.ts`, `360p_001.ts`, etc. - Segmentos de vídeo
 *       - `thumbnail.jpg` - Miniatura do vídeo
 *       
 *       **Headers CORS configurados para streaming.**
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do vídeo
 *         example: "d64d5bda-28de-48f5-a451-05e20c764d7f"
 *       - in: path
 *         name: file
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome do arquivo (master.m3u8, 360p.m3u8, segmentos .ts, thumbnail.jpg)
 *         example: "master.m3u8"
 *     responses:
 *       200:
 *         description: Arquivo encontrado
 *         content:
 *           application/vnd.apple.mpegurl:
 *             schema:
 *               type: string
 *               description: Playlist HLS (.m3u8)
 *           video/mp2t:
 *             schema:
 *               type: string
 *               format: binary
 *               description: Segmento de vídeo (.ts)
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *               description: Thumbnail (.jpg)
 *       404:
 *         description: Arquivo não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
app.use('/processed', express.static(processedDir, {
  setHeaders: (res, path) => {
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Range, Content-Length');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    
    if (path.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else if (path.endsWith('.ts')) { 
      res.setHeader('Content-Type', 'video/mp2t');
      res.setHeader('Cache-Control', 'public, max-age=86400'); 
      res.setHeader('Accept-Ranges', 'bytes');
    } else if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') || path.endsWith('.webp')) {
      res.setHeader('Content-Type', path.endsWith('.png') ? 'image/png' : path.endsWith('.webp') ? 'image/webp' : 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=604800'); 
    }
  }
}));

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Sistema]
 *     summary: Health Check
 *     description: |
 *       Verifica o status da aplicação e serviços dependentes.
 *       Endpoint útil para monitoramento e load balancers.
 *     responses:
 *       200:
 *         description: Sistema funcionando corretamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 *             examples:
 *               healthy:
 *                 summary: Sistema saudável
 *                 value:
 *                   status: "healthy"
 *                   timestamp: "2025-01-01T00:00:00Z"
 *                   services:
 *                     database: "connected"
 *                     redis: "connected"
 *                     ffmpeg: "available"
 *       500:
 *         description: Sistema com problemas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 *             examples:
 *               unhealthy:
 *                 summary: Sistema com falhas
 *                 value:
 *                   status: "unhealthy"
 *                   timestamp: "2025-01-01T00:00:00Z"
 *                   services:
 *                     database: "disconnected"
 *                     redis: "connected"
 *                     ffmpeg: "available"
 */
app.get('/health', async (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'ES Modules migration completed successfully'
  });
});

app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Arquivo muito grande' });
    }
  }
  
  res.status(500).json({ error: 'Erro interno do servidor' });
});





app.use('*', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

app.listen(PORT, () => {
  
  Queue.add('Ping', { message: 'Servidor iniciado' })
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Health check disponível em http://localhost:${PORT}/health`);
});