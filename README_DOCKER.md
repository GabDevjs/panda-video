# Docker Setup - Panda Video Backend

## Arquitetura

O backend foi dividido em duas imagens Docker separadas:

### 1. **App Principal** (API)
- **Dockerfile**: `Dockerfile-app`
- **Comando**: `npm run start:app`
- **Porta**: 3033
- **Função**: Serve a API REST, rotas, autenticação e Bull Board dashboard
- **Recursos**: Sem FFmpeg (mais leve)

### 2. **Worker** (Processamento de Filas)
- **Dockerfile**: `Dockerfile-worker`  
- **Comando**: `npm run start:worker`
- **Função**: Processa filas de vídeo, conversão HLS
- **Recursos**: Com FFmpeg para processamento de vídeo

## Configuração no Coolify

### Serviço 1: API Principal
```yaml
nome: panda-video-api
dockerfile: Dockerfile-app
porta: 3033
variáveis:
  NODE_ENV: production
  PORT: 3033
  DB_HOST: postgres
  REDIS_HOST: redis
  # ... outras variáveis
```

### Serviço 2: Worker
```yaml
nome: panda-video-worker
dockerfile: Dockerfile-worker
sem porta exposta
variáveis:
  NODE_ENV: production
  DB_HOST: postgres
  REDIS_HOST: redis
  # ... outras variáveis
```

## Scripts Disponíveis

### Desenvolvimento
```bash
npm run dev:app     # API apenas
npm run dev:worker  # Worker apenas
npm run dev         # Monolítico (original)
```

### Produção
```bash
npm run start:app     # API apenas
npm run start:worker  # Worker apenas
npm run start         # Monolítico (original)
```

## Vantagens da Separação

1. **Escalabilidade**: Escalar API e workers independentemente
2. **Recursos**: API sem FFmpeg (mais leve)
3. **Isolamento**: Falhas no worker não afetam a API
4. **Monitoramento**: Logs separados para cada serviço
5. **Deploy**: Deploy independente de cada serviço

## Volumes Compartilhados

Ambos os serviços precisam acesso aos mesmos volumes:
- `/app/uploads` - Arquivos enviados
- `/app/processed` - Arquivos processados

## Healthchecks

- **API**: `curl -f http://localhost:3033/health`
- **Worker**: `pgrep -f "node.*worker"`

## Monitoramento

O Bull Board dashboard está disponível apenas na API:
- URL: `http://api-url/admin/queues`
- Credenciais: `admin` / `password` (configurável)