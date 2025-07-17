import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getBilling } from '../controllers/billingController.js';

const router = express.Router();

router.use(authenticateToken);

/**
 * @swagger
 * /api/billing:
 *   get:
 *     tags: [Faturamento]
 *     summary: Consultar faturamento total
 *     description: |
 *       Retorna o valor total faturado do usuário autenticado.
 *       
 *       **Regra de cobrança:**
 *       - $0.50 por minuto de vídeo processado
 *       - Duração arredondada para cima (ceil)
 *       - Exemplos:
 *         - 10min 1s → 11 minutos → $5.50
 *         - 5min 30s → 6 minutos → $3.00
 *         - 2min exatos → 2 minutos → $1.00
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Faturamento total do usuário
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Billing'
 *             examples:
 *               billing_example:
 *                 summary: Exemplo de faturamento
 *                 value:
 *                   total: 15.50
 *                   currency: "USD"
 *       401:
 *         description: Token inválido ou não fornecido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               unauthorized:
 *                 summary: Não autenticado
 *                 value:
 *                   error: "Token de acesso requerido"
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', getBilling);

export default router;