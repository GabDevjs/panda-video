import { getUserBilling } from '../services/billingService.js';

const getBilling = async (req, res) => {
  try {
    const billing = await getUserBilling(req.user.id);
    res.json(billing);

  } catch (error) {
    console.error('Get billing error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export { getBilling };