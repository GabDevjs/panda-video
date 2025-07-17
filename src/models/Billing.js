import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Billing = sequelize.define('Billing', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    video_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'videos',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    minutes_processed: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Duração processada em minutos arredondados para cima'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Valor cobrado em dólares'
    }
  }, {
    tableName: 'billing',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      {
        fields: ['user_id']
      }
    ]
  });

  Billing.associate = (models) => {
    Billing.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    Billing.belongsTo(models.Video, {
      foreignKey: 'video_id',
      as: 'video'
    });
  };

  return Billing;
};
