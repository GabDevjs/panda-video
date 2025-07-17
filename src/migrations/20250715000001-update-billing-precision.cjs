'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Primeiro, adicionar a nova coluna seconds_processed
    await queryInterface.addColumn('billing', 'seconds_processed', {
      type: Sequelize.DECIMAL(15, 6),
      allowNull: true, // Temporariamente permitir NULL para migração
      comment: 'Duração processada em segundos com alta precisão'
    });

    // Migrar dados existentes: converter minutes_processed para seconds_processed
    await queryInterface.sequelize.query(`
      UPDATE billing 
      SET seconds_processed = minutes_processed * 60 
      WHERE seconds_processed IS NULL
    `);

    // Tornar seconds_processed obrigatório após migração
    await queryInterface.changeColumn('billing', 'seconds_processed', {
      type: Sequelize.DECIMAL(15, 6),
      allowNull: false,
      comment: 'Duração processada em segundos com alta precisão'
    });

    // Atualizar precisão do amount para 15,8
    await queryInterface.changeColumn('billing', 'amount', {
      type: Sequelize.DECIMAL(15, 8),
      allowNull: false,
      comment: 'Valor cobrado com alta precisão (8 casas decimais)'
    });

    // Remover coluna minutes_processed (após migração dos dados)
    await queryInterface.removeColumn('billing', 'minutes_processed');
  },

  async down(queryInterface, Sequelize) {
    // Reverter: adicionar minutes_processed de volta
    await queryInterface.addColumn('billing', 'minutes_processed', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true
    });

    // Converter seconds_processed de volta para minutes_processed
    await queryInterface.sequelize.query(`
      UPDATE billing 
      SET minutes_processed = CEIL(seconds_processed / 60) 
      WHERE minutes_processed IS NULL
    `);

    await queryInterface.changeColumn('billing', 'minutes_processed', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false
    });

    // Reverter amount para precisão anterior
    await queryInterface.changeColumn('billing', 'amount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false
    });

    // Remover seconds_processed
    await queryInterface.removeColumn('billing', 'seconds_processed');
  }
};