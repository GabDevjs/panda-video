import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Video = sequelize.define('Video', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
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
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    original_filename: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    file_path: {
      type: DataTypes.STRING(500)
    },
    hls_path: {
      type: DataTypes.STRING(500)
    },
    thumbnail_path: {
      type: DataTypes.STRING(500)
    },
    duration: {
      type: DataTypes.INTEGER,
      comment: 'Duração em segundos'
    },
    original_resolution: {
      type: DataTypes.STRING(20),
      comment: 'ex: 1920x1080'
    },
    available_resolutions: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      comment: 'Array de resoluções disponíveis'
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Define se o vídeo é público (true) ou privado (false)'
    },
    status: {
      type: DataTypes.ENUM('uploading', 'processing', 'completed', 'failed'),
      defaultValue: 'uploading'
    }
  }, {
    tableName: 'videos',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['is_public']
      },
      {
        fields: ['is_public', 'created_at']
      }
    ]
  });

  Video.associate = (models) => {
    Video.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    Video.hasMany(models.Billing, {
      foreignKey: 'video_id',
      as: 'billings'
    });
  };

  return Video;
};
