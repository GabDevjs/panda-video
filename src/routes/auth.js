import express from 'express';
import { login, register } from '../controllers/authController.js';

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

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Autenticação]
 *     summary: Registrar novo usuário
 *     description: |
 *       Cria uma nova conta de usuário no sistema.
 *       
 *       **Validações:**
 *       - Username: alfanumérico, 3-30 caracteres
 *       - Email: formato válido
 *       - Password: mínimo 6 caracteres
 *       - Confirmação de senha obrigatória
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - confirmPassword
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *                 pattern: '^[a-zA-Z0-9]+$'
 *                 example: "novousuario"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "novo@exemplo.com"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: "minhasenha123"
 *               confirmPassword:
 *                 type: string
 *                 minLength: 6
 *                 example: "minhasenha123"
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 3
 *                     username:
 *                       type: string
 *                       example: "novousuario"
 *                     email:
 *                       type: string
 *                       example: "novo@exemplo.com"
 *                     role:
 *                       type: string
 *                       example: "user"
 *       400:
 *         description: Dados inválidos ou usuário já existe
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   examples:
 *                     - "Nome de usuário já existe"
 *                     - "Email já está em uso"
 *                     - "Password deve ter pelo menos 6 caracteres"
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/register', register);

export default router;