'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('videos', 'is_public', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Define se o vídeo é público (true) ou privado (false)'
    });

    // Adicionar índice para otimizar consultas de vídeos públicos
    await queryInterface.addIndex('videos', ['is_public']);
    await queryInterface.addIndex('videos', ['is_public', 'created_at']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('videos', ['is_public', 'created_at']);
    await queryInterface.removeIndex('videos', ['is_public']);
    await queryInterface.removeColumn('videos', 'is_public');
  }
};