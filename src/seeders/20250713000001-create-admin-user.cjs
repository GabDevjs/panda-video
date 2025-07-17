'use strict';

const bcrypt = require('bcryptjs');


module.exports = {
  async up(queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await queryInterface.bulkInsert('users', [
      {
        username: 'admin',
        email: 'admin@pandavideo.com',
        password: hashedPassword,
        role: 'admin',
        storage_limit: 107374182400, 
        storage_used: 0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        username: 'testuser',
        email: 'test@pandavideo.com',
        password: await bcrypt.hash('test123', 10),
        role: 'user',
        storage_limit: 5368709120, 
        storage_used: 0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', {
      username: ['admin', 'testuser']
    }, {});
  }
};
