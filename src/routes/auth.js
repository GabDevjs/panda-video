import express from 'express';
import { login } from '../controllers/authController.js';

const router = express.Router();


/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Autenticação]
 *     summary: Autenticar usuário
 *     description: |
 *       Realiza login do usuário e retorna JWT token para autenticação.
 *       
 *       **Credenciais de teste:**
 *       - Username: `testuser`
 *       - Password: `password`
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           examples:
 *             login_example:
 *               summary: Login com credenciais de teste
 *               value:
 *                 username: "testuser"
 *                 password: "password"
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *             examples:
 *               success:
 *                 summary: Login bem-sucedido
 *                 value:
 *                   token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                   user:
 *                     id: 1
 *                     username: "testuser"
 *                     email: "test@pandavideo.com"
 *       400:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               missing_fields:
 *                 summary: Campos obrigatórios ausentes
 *                 value:
 *                   error: "Username e password são obrigatórios"
 *       401:
 *         description: Credenciais inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalid_credentials:
 *                 summary: Credenciais incorretas
 *                 value:
 *                   error: "Credenciais inválidas"
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', login);

export default router;