import swaggerJSDoc from 'swagger-jsdoc';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Panda Video API',
      version: '1.0.0',
      description: `
# Panda Video API

API completa para hospedagem e processamento de vídeos com conversão HLS.

## Características Principais

- 🔐 **Autenticação JWT** - Sistema seguro de autenticação
- 📹 **Upload de Vídeos** - Suporte para MP4, AVI, MOV, MKV (até 500MB)
- 🎬 **Processamento HLS** - Conversão automática usando FFmpeg
- 💰 **Faturamento Automático** - $0.50 por minuto processado (arredondado para cima)
- ⚡ **Cache Redis** - Performance otimizada
- 📊 **Bull Queue** - Processamento assíncrono de vídeos
- 🐳 **Dockerizado** - Pronto para produção

## Credenciais de Teste

- **Usuário:** testuser
- **Senha:** password

## URLs Importantes

- **Bull Board Dashboard:** /admin/queues (admin/password)
- **HLS Demo:** Para testar vídeos processados
- **Health Check:** /health

## Faturamento

O sistema cobra **$0.50 por minuto** de vídeo processado.
Exemplos:
- 10min 1s → 11 minutos → $5.50
- 5min 30s → 6 minutos → $3.00
- 2min exatos → 2 minutos → $1.00
      `,
      contact: {
        name: 'Panda Video Team',
        email: 'dev@pandavideo.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    tags: [
      {
        name: 'Autenticação',
        description: 'Endpoints para login e autenticação JWT'
      },
      {
        name: 'Vídeos',
        description: 'Gerenciamento de vídeos - upload, listagem, edição'
      },
      {
        name: 'Vídeos Públicos',
        description: 'Vídeos públicos visíveis sem autenticação'
      },
      {
        name: 'Faturamento',
        description: 'Consulta de faturamento baseado no processamento'
      },
      {
        name: 'Sistema',
        description: 'Health check e monitoramento do sistema'
      }
    ],
    servers: [
      {
        url: process.env.NODE_ENV === 'production' ? 'https://api.pandavideo.com' : 'http://localhost:3000',
        description: process.env.NODE_ENV === 'production' ? 'Produção' : 'Desenvolvimento'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtido através do endpoint /api/auth/login'
        },
        basicAuth: {
          type: 'http',
          scheme: 'basic',
          description: 'Autenticação HTTP Basic para Bull Board Dashboard (admin/password)'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID único do usuário'
            },
            username: {
              type: 'string',
              description: 'Nome de usuário'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email do usuário'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Data de criação'
            }
          }
        },
        Video: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID único do vídeo'
            },
            title: {
              type: 'string',
              description: 'Título do vídeo'
            },
            description: {
              type: 'string',
              description: 'Descrição do vídeo'
            },
            hls_path: {
              type: 'string',
              description: 'Caminho para o arquivo HLS (.m3u8)'
            },
            thumbnail_path: {
              type: 'string',
              description: 'Caminho para a thumbnail'
            },
            duration: {
              type: 'integer',
              description: 'Duração em segundos'
            },
            original_resolution: {
              type: 'string',
              description: 'Resolução original do vídeo'
            },
            available_resolutions: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Resoluções disponíveis'
            },
            status: {
              type: 'string',
              enum: ['uploading', 'processing', 'completed', 'failed'],
              description: 'Status do processamento'
            },
            is_public: {
              type: 'boolean',
              description: 'Se o vídeo é público'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Data de criação'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Data de atualização'
            }
          }
        },
        Billing: {
          type: 'object',
          properties: {
            total: {
              type: 'number',
              format: 'float',
              description: 'Total faturado'
            },
            currency: {
              type: 'string',
              default: 'USD',
              description: 'Moeda'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: {
              type: 'string',
              description: 'Nome de usuário ou email',
              example: 'testuser'
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'Senha do usuário',
              example: 'password'
            }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'JWT token para autenticação',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            },
            user: {
              $ref: '#/components/schemas/User'
            }
          }
        },
        VideoUploadRequest: {
          type: 'object',
          required: ['title', 'video'],
          properties: {
            title: {
              type: 'string',
              maxLength: 255,
              description: 'Título do vídeo',
              example: 'Meu vídeo incrível'
            },
            description: {
              type: 'string',
              maxLength: 1000,
              description: 'Descrição do vídeo (opcional)',
              example: 'Este é um vídeo demonstrativo do sistema'
            },
            is_public: {
              type: 'boolean',
              description: 'Se o vídeo deve ser público',
              default: false,
              example: true
            },
            video: {
              type: 'string',
              format: 'binary',
              description: 'Arquivo de vídeo (MP4, AVI, MOV, MKV - máx 500MB)'
            }
          }
        },
        VideoUpdateRequest: {
          type: 'object',
          required: ['title'],
          properties: {
            title: {
              type: 'string',
              maxLength: 255,
              description: 'Novo título do vídeo',
              example: 'Título atualizado'
            },
            description: {
              type: 'string',
              maxLength: 1000,
              description: 'Nova descrição do vídeo',
              example: 'Descrição atualizada'
            },
            is_public: {
              type: 'boolean',
              description: 'Alterar visibilidade do vídeo',
              example: false
            }
          }
        },
        VideoListResponse: {
          type: 'object',
          properties: {
            videos: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Video'
              }
            },
            pagination: {
              $ref: '#/components/schemas/Pagination'
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              description: 'Página atual',
              example: 1
            },
            limit: {
              type: 'integer',
              description: 'Itens por página',
              example: 10
            },
            total: {
              type: 'integer',
              description: 'Total de itens',
              example: 50
            },
            totalPages: {
              type: 'integer',
              description: 'Total de páginas',
              example: 5
            }
          }
        },
        BillingDetails: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID do registro de faturamento'
            },
            video_id: {
              type: 'string',
              format: 'uuid',
              description: 'ID do vídeo processado'
            },
            minutes_processed: {
              type: 'number',
              format: 'float',
              description: 'Minutos processados (arredondado para cima)'
            },
            amount: {
              type: 'number',
              format: 'float',
              description: 'Valor cobrado em USD'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Data do processamento'
            }
          }
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'unhealthy'],
              description: 'Status da aplicação'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp da verificação'
            },
            services: {
              type: 'object',
              properties: {
                database: {
                  type: 'string',
                  enum: ['connected', 'disconnected'],
                  description: 'Status do banco de dados'
                },
                redis: {
                  type: 'string',
                  enum: ['connected', 'disconnected'],
                  description: 'Status do Redis'
                },
                ffmpeg: {
                  type: 'string',
                  enum: ['available', 'unavailable'],
                  description: 'Status do FFmpeg'
                }
              }
            }
          }
        },
        PublicVideoListResponse: {
          type: 'object',
          properties: {
            videos: {
              type: 'array',
              items: {
                allOf: [
                  { $ref: '#/components/schemas/Video' },
                  {
                    type: 'object',
                    properties: {
                      user: {
                        type: 'object',
                        properties: {
                          username: {
                            type: 'string',
                            description: 'Nome do criador'
                          }
                        }
                      }
                    }
                  }
                ]
              }
            },
            pagination: {
              $ref: '#/components/schemas/Pagination'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Mensagem de erro',
              example: 'Token inválido'
            },
            details: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Detalhes do erro (opcional)'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js']
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

export default swaggerSpec;