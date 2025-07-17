import jwt from 'jsonwebtoken';
import db from '../models/index.js';

const { User } = db;

const autenticarTokenn = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findByPk(decoded.userId, {
      attributes: ['id', 'username', 'email']
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(403).json({ error: 'Token inválido' });
  }
};


const autenticacaoOpcional = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findByPk(decoded.userId, {
      attributes: ['id', 'username', 'email']
    });
    
    req.user = user || null;
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

export { autenticarTokenn as authenticateToken, autenticacaoOpcional as optionalAuth };