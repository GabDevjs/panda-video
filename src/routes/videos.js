import express from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { cacheMiddleware, invalidateCache } from '../middleware/cache.js';
import upload from '../config/multer.js';
import { uploadVideo, getVideos, getVideo, getPublicVideos, getVideoOrPublic, updateVideo } from '../controllers/videoController.js';

const router = express.Router();


/**
 * @swagger
 * /api/videos/public:
 *   get:
 *     tags: [Vídeos Públicos]
 *     summary: Listar vídeos públicos
 *     description: |
 *       Lista todos os vídeos marcados como públicos. Não requer autenticação.
 *       Inclui paginação e cache de 10 minutos.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Itens por página (máx 100)
 *     responses:
 *       200:
 *         description: Lista de vídeos públicos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PublicVideoListResponse'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/public', cacheMiddleware(600), getPublicVideos);

/**
 * @swagger
 * /api/videos/watch/{id}:
 *   get:
 *     tags: [Vídeos Públicos]
 *     summary: Assistir vídeo público ou próprio
 *     description: |
 *       Retorna detalhes de um vídeo para assistir. Se não autenticado, só mostra vídeos públicos.
 *       Se autenticado, mostra vídeos próprios ou públicos.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do vídeo
 *     security:
 *       - bearerAuth: []
 *       - {}
 *     responses:
 *       200:
 *         description: Detalhes do vídeo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Video'
 *       404:
 *         description: Vídeo não encontrado ou não é público
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/watch/:id', optionalAuth, cacheMiddleware(600), getVideoOrPublic);

router.use(authenticateToken);

/**
 * @swagger
 * /api/videos/upload:
 *   post:
 *     tags: [Vídeos]
 *     summary: Upload de vídeo
 *     description: |
 *       Faz upload de um vídeo para processamento HLS.
 *       
 *       **Formatos aceitos:** MP4, AVI, MOV, MKV
 *       **Tamanho máximo:** 500MB
 *       **Duração máxima:** 20 minutos
 *       
 *       O vídeo será processado assincronamente e convertido para HLS (.m3u8).
 *       O custo é de **$0.50 por minuto** processado (arredondado para cima).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/VideoUploadRequest'
 *           examples:
 *             upload_example:
 *               summary: Upload básico de vídeo
 *               value:
 *                 title: "Meu vídeo incrível"
 *                 description: "Descrição do meu vídeo"
 *                 is_public: true
 *     responses:
 *       200:
 *         description: Vídeo enviado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Vídeo enviado com sucesso"
 *                 video:
 *                   $ref: '#/components/schemas/Video'
 *       400:
 *         description: Dados inválidos ou arquivo muito grande
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               missing_file:
 *                 summary: Arquivo não enviado
 *                 value:
 *                   error: "Arquivo de vídeo é obrigatório"
 *               file_too_large:
 *                 summary: Arquivo muito grande
 *                 value:
 *                   error: "Arquivo muito grande"
 *       401:
 *         description: Token inválido ou não fornecido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/upload', upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), invalidateCache('cache_/api/videos*'), uploadVideo);

/**
 * @swagger
 * /api/videos:
 *   get:
 *     tags: [Vídeos]
 *     summary: Listar vídeos do usuário
 *     description: |
 *       Lista todos os vídeos do usuário autenticado com paginação.
 *       Cache de 5 minutos para melhor performance.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Itens por página (máx 100)
 *     responses:
 *       200:
 *         description: Lista de vídeos do usuário
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VideoListResponse'
 *       401:
 *         description: Token inválido ou não fornecido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', cacheMiddleware(300), getVideos);

/**
 * @swagger
 * /api/videos/{id}:
 *   get:
 *     tags: [Vídeos]
 *     summary: Obter detalhes de um vídeo
 *     description: |
 *       Retorna os detalhes completos de um vídeo específico do usuário.
 *       Inclui URL do HLS para reprodução e informações de processamento.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único do vídeo
 *         example: "d64d5bda-28de-48f5-a451-05e20c764d7f"
 *     responses:
 *       200:
 *         description: Detalhes do vídeo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Video'
 *             examples:
 *               completed_video:
 *                 summary: Vídeo processado com sucesso
 *                 value:
 *                   id: "d64d5bda-28de-48f5-a451-05e20c764d7f"
 *                   title: "Meu vídeo"
 *                   description: "Descrição do vídeo"
 *                   hls_path: "/processed/d64d5bda-28de-48f5-a451-05e20c764d7f/master.m3u8"
 *                   thumbnail_path: "/processed/d64d5bda-28de-48f5-a451-05e20c764d7f/thumbnail.jpg"
 *                   duration: 120
 *                   original_resolution: "1920x1080"
 *                   available_resolutions: ["640x360"]
 *                   status: "completed"
 *                   is_public: false
 *                   created_at: "2025-01-01T00:00:00Z"
 *       401:
 *         description: Token inválido ou não fornecido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Vídeo não encontrado ou não pertence ao usuário
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', cacheMiddleware(600), getVideo);

/**
 * @swagger
 * /api/videos/{id}:
 *   put:
 *     tags: [Vídeos]
 *     summary: Editar vídeo
 *     description: |
 *       Atualiza as informações de um vídeo (título, descrição, visibilidade).
 *       Apenas o proprietário pode editar o vídeo.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único do vídeo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VideoUpdateRequest'
 *           examples:
 *             update_example:
 *               summary: Atualizar título e tornar público
 *               value:
 *                 title: "Novo título do vídeo"
 *                 description: "Nova descrição atualizada"
 *                 is_public: true
 *     responses:
 *       200:
 *         description: Vídeo atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Vídeo atualizado com sucesso"
 *                 video:
 *                   $ref: '#/components/schemas/Video'
 *       400:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Token inválido ou não fornecido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Vídeo não encontrado ou não pertence ao usuário
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', invalidateCache('cache_/api/videos*'), updateVideo);

export default router;