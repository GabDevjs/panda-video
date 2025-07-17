'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Habilitar extensão UUID se não estiver habilitada
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    await queryInterface.createTable('videos', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()')
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT
      },
      original_filename: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      file_path: {
        type: Sequelize.STRING(500)
      },
      hls_path: {
        type: Sequelize.STRING(500)
      },
      thumbnail_path: {
        type: Sequelize.STRING(500)
      },
      duration: {
        type: Sequelize.INTEGER,
        comment: 'Duração em segundos'
      },
      original_resolution: {
        type: Sequelize.STRING(20),
        comment: 'ex: 1920x1080'
      },
      available_resolutions: {
        type: Sequelize.ARRAY(Sequelize.TEXT),
        comment: 'Array de resoluções disponíveis'
      },
      status: {
        type: Sequelize.ENUM('uploading', 'processing', 'completed', 'failed'),
        defaultValue: 'uploading'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Adicionar índices
    await queryInterface.addIndex('videos', ['user_id']);
    await queryInterface.addIndex('videos', ['status']);
    await queryInterface.addIndex('videos', ['created_at']);

    // Criar trigger para updated_at
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await queryInterface.sequelize.query(`
      CREATE TRIGGER update_videos_updated_at 
          BEFORE UPDATE ON videos 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column();
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS update_videos_updated_at ON videos;');
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS update_updated_at_column();');
    await queryInterface.dropTable('videos');
  }
};
