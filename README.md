# Panda Video Backend

Sistema de hospedagem e processamento de vídeos com conversão HLS, autenticação JWT e faturamento automático.

## 🚀 Características

- **Upload de Vídeos**: Suporte para MP4, AVI, MOV, MKV (até 500MB)
- **Processamento HLS**: Conversão automática usando FFmpeg
- **Autenticação JWT**: Sistema seguro de autenticação
- **Faturamento Automático**: $0.50 por minuto processado
- **Cache Redis**: Performance otimizada com cache inteligente
- **API RESTful**: Endpoints bem documentados
- **Containerização**: Docker e Docker Compose

## 📋 Pré-requisitos

- Docker e Docker Compose
- Node.js 18+ (para desenvolvimento local)

## 🛠️ Instalação e Execução

### Com Docker (Recomendado)

1. Clone o repositório:
```bash
git clone <repository-url>
cd panda-video-backend
```

2. Configure as variáveis de ambiente:
```bash
cp .env.example .env
# Edite o .env conforme necessário (opcional, valores padrão já funcionam)
```

3. **Execute com um único comando:**
```bash
docker-compose up --build
```

4. Aguarde a inicialização completa (pode levar alguns minutos):
   - ✅ PostgreSQL com tabelas criadas automaticamente
   - ✅ Redis configurado e funcionando
   - ✅ Aplicação principal rodando
   - ✅ Queue worker processando vídeos

5. A API estará disponível em: `http://localhost:3000`

**Credenciais de teste:**
- Usuário: `testuser`
- Senha: `password`

### Documentação da API

- **Swagger UI**: `http://localhost:3000/api/docs`
- **Bull Board Dashboard**: `http://localhost:3000/admin/queues`

### Desenvolvimento Local

1. Instale dependências:
```bash
npm install
```

2. Configure PostgreSQL e Redis localmente

3. Execute migrações:
```bash
psql -U postgres -d panda_video -f init.sql
```

4. Inicie em modo desenvolvimento:
```bash
npm run dev
```

## 📚 API Endpoints

### Autenticação

#### POST /api/auth/login
Autentica um usuário e retorna JWT token.

**Request:**
```json
{
  "username": "testuser",
  "password": "password"
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@pandavideo.com"
  }
}
```

### Vídeos

#### POST /api/videos/upload
Upload e processamento de vídeo.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**FormData:**
- `title`: Título do vídeo (obrigatório)
- `description`: Descrição do vídeo (opcional)
- `video`: Arquivo de vídeo (obrigatório)

**Response:**
```json
{
  "message": "Vídeo enviado com sucesso",
  "video": {
    "id": 1,
    "title": "Meu Vídeo",
    "status": "processing"
  }
}
```

#### GET /api/videos?page=1&limit=10
Lista vídeos do usuário com paginação.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "videos": [
    {
      "id": 1,
      "title": "Meu Vídeo",
      "description": "Descrição do vídeo",
      "status": "completed",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

#### GET /api/videos/:id
Detalhes de um vídeo específico.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "id": 1,
  "title": "Meu Vídeo",
  "description": "Descrição do vídeo",
  "hls_path": "/processed/1/playlist.m3u8",
  "duration": 120,
  "status": "completed",
  "created_at": "2025-01-01T00:00:00Z"
}
```

#### PUT /api/videos/:id
Atualiza informações de um vídeo específico.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request:**
```json
{
  "title": "Novo Título do Vídeo",
  "description": "Nova descrição do vídeo",
  "is_public": true
}
```

**Response:**
```json
{
  "message": "Vídeo atualizado com sucesso",
  "video": {
    "id": 1,
    "title": "Novo Título do Vídeo",
    "description": "Nova descrição do vídeo",
    "is_public": true,
    "hls_path": "/processed/1/playlist.m3u8",
    "duration": 120,
    "status": "completed",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:10:00Z"
  }
}
```

### Faturamento

#### GET /api/billing
Consulta faturamento total do usuário.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "total": 15.50,
  "currency": "USD"
}
```

### Health Check

#### GET /health
Verificação da saúde dos serviços.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "ffmpeg": "available"
  }
}
```

### Bull Board Dashboard

#### GET /admin/queues
Interface web para monitoramento das filas de processamento.

**Autenticação:**
- Usuário: `admin` (configurável via `BULL_BOARD_USER`)
- Senha: `password` (configurável via `BULL_BOARD_PASSWORD`)

**Funcionalidades:**
- Monitoramento de filas de processamento de vídeo
- Visualização de jobs pendentes, ativos e completados
- Interface para retry e limpeza de jobs
- Métricas de performance em tempo real

## 🗄️ Estrutura do Banco de Dados

### Usuários
```sql
users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE,
  email VARCHAR(100) UNIQUE,
  password VARCHAR(255),
  created_at TIMESTAMP
)
```

### Vídeos
```sql
videos (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title VARCHAR(255),
  description TEXT,
  original_filename VARCHAR(255),
  file_path VARCHAR(500),
  hls_path VARCHAR(500),
  duration INTEGER,
  status VARCHAR(20), -- uploading, processing, completed, failed
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Faturamento
```sql
billing (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  video_id INTEGER REFERENCES videos(id),
  minutes_processed DECIMAL(10,2),
  amount DECIMAL(10,2),
  created_at TIMESTAMP
)
```

## ⚙️ Configuração

### Variáveis de Ambiente

```bash
# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=panda_video
DB_USER=postgres
DB_PASSWORD=postgres123

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=24h

# Billing
COST_PER_MINUTE=0.50

# App
NODE_ENV=production
PORT=3000
MAX_FILE_SIZE=524288000
UPLOAD_PATH=./uploads
PROCESSED_PATH=./processed
```

## 🧪 Testes

Execute os testes:
```bash
npm test
```

Testes em modo watch:
```bash
npm run test:watch
```

## 📊 Monitoramento

### Logs
A aplicação gera logs estruturados para facilitar o monitoramento:

```json
{
  "timestamp": "2025-01-01T00:00:00Z",
  "level": "info",
  "message": "Video processing completed",
  "videoId": "123",
  "userId": "456",
  "duration": "120s",
  "cost": "1.00"
}
```

### Métricas
- Request rate e response time
- Taxa de erro e sucesso de upload
- Vídeos processados por hora
- Cache hit rate
- Uso de recursos (CPU, memória, disco)

## 🔧 Desenvolvimento

### Estrutura do Projeto
```
src/
├── config/          # Configurações (DB, Redis, Multer)
├── controllers/     # Lógica de controle das rotas
├── middleware/      # Middlewares (auth, cache)
├── models/          # Modelos de dados (se necessário)
├── routes/          # Definição de rotas
├── services/        # Lógica de negócio
└── utils/           # Utilitários e helpers
```

### Scripts Disponíveis
- `npm start`: Inicia em produção
- `npm run dev`: Inicia em desenvolvimento com nodemon
- `npm test`: Executa testes
- `npm run test:watch`: Testes em modo watch

## 🔒 Segurança

### Medidas Implementadas
- Autenticação JWT com expiração
- Helmet para headers de segurança
- Validação de tipos de arquivo
- Sanitização de inputs com Joi
- Rate limiting (pode ser implementado)
- CORS configurado

### Usuário de Teste
```
Username: testuser
Password: password
Email: test@pandavideo.com
```

## 🚀 Deploy

### Produção com Docker
```bash
# Build da imagem
docker build -t panda-video-backend .

# Executar com variáveis de ambiente
docker run -d \
  --name panda-video \
  -p 3000:3000 \
  --env-file .env \
  panda-video-backend
```

### Considerações de Produção
- Use um secret JWT forte e seguro
- Configure backup do PostgreSQL
- Monitore uso de disco para uploads/processed
- Configure log rotation
- Use HTTPS em produção
- Considere usar um Load Balancer

## 📝 Notas de Implementação

### Processamento de Vídeo
- Conversão HLS com qualidade única (360p por padrão)
- Resolução de saída: 640x360 com bitrate de 800kbps
- Se vídeo original < 360p, mantém resolução original
- Segmentos de 6 segundos otimizados para streaming
- Processamento assíncrono com Bull Queue
- Geração automática de thumbnails (frame aleatório entre 15%-25%)
- Limpeza automática de arquivos originais
- Compatível com HLS Demo para testes

### Cache
- Redis para listagem de vídeos (5 min)
- Cache de detalhes de vídeo (10 min)
- Invalidação automática em uploads
- Fallback para banco em caso de falha

### Faturamento
- Cálculo automático por minuto processado
- Arredondamento para cima
- Registro detalhado para auditoria
- Consulta agregada por usuário

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes.

## 📞 Suporte

Para dúvidas ou problemas, abra uma issue no repositório ou entre em contato com a equipe de desenvolvimento.