import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import db from '../models/index.js';

const { User } = db;

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

const login = async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { username, password } = value;

    const user = await User.findOne({
      where: { username },
      attributes: ['id', 'username', 'email', 'password']
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export { login };