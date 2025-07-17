'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('billing', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
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
      video_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'videos',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      minutes_processed: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Adicionar índices
    await queryInterface.addIndex('billing', ['user_id']);
    await queryInterface.addIndex('billing', ['video_id']);
    await queryInterface.addIndex('billing', ['created_at']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('billing');
  }
};
