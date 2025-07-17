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
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter.js';
import { ExpressAdapter } from '@bull-board/express';
import basicAuth from 'express-basic-auth';
import Queue from './utils/Queue.js';

const __filename = fileURLToPath(import.meta.url);

const app = express();
const PORT = process.env.PORT || 3033;

// Security middleware
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
  origin: ['http://localhost:8080', 'http://localhost:8081', 'http://localhost:3033', 'http://ww8coo8coso4ck44ck8gsoow.31.97.166.190.sslip.io'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Authorization', 'Range', 'Accept'],
  exposedHeaders: ['Content-Range', 'Content-Length', 'Accept-Ranges']
}));

app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create directories
const uploadDir = process.env.UPLOAD_PATH || './uploads';
const processedDir = process.env.PROCESSED_PATH || './processed';

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(processedDir)) {
  fs.mkdirSync(processedDir, { recursive: true });
}

// Bull Board setup
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

const bullBoardUser = process.env.BULL_BOARD_USER || 'admin';
const bullBoardPassword = process.env.BULL_BOARD_PASSWORD || 'password';

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

const initializeServices = async () => {
  try {
    console.log('🔧 Iniciando serviços da aplicação...');
    
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
    
    await sequelize.sync({ alter: false });
    console.log('Modelos sincronizados com o banco de dados.');
    
    // Configurar Bull Board (apenas monitoramento, sem processamento)
    console.log('🔧 Configurando Bull Board Dashboard...');
    console.log(`📋 Filas disponíveis para monitoramento: ${Queue.queues.length}`);
    
    Queue.queues.forEach((queue, index) => {
      console.log(`${index + 1}. ${queue.name} (${queue.fullName})`);
    });
    
    const bullAdapters = Queue.queues.map((queue) => new BullAdapter(queue.bull));
    const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
      queues: bullAdapters,
      serverAdapter: serverAdapter,
    });
    
    console.log('✅ Bull Board Dashboard configurado (somente monitoramento)');
    
  } catch (error) {
    console.error('Erro ao inicializar serviços:', error);
    process.exit(1);
  }
};

initializeServices();

// Routes
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Panda Video API Documentation'
}));

app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/billing', billingRoutes);

// Bull Board with authentication
app.use(
  '/admin/queues',
  basicAuth({
    users: { [bullBoardUser]: bullBoardPassword },
    challenge: true
  }),
  serverAdapter.getRouter()
);

// Serve processed files
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

// Health check
app.get('/health', async (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'API servidor funcionando',
    services: {
      redis: redisClient.isOpen ? 'connected' : 'disconnected',
      database: 'connected'
    }
  });
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

app.listen(PORT, () => {
  console.log(`🚀 API servidor rodando na porta ${PORT}`);
  console.log(`📋 Health check disponível em http://localhost:${PORT}/health`);
  console.log(`📊 Bull Board dashboard em http://localhost:${PORT}/admin/queues`);
});