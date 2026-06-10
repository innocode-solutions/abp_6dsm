# Documentacao de Uso - ProconBot Jacarei

Atualizado em: 2026-06-08

## 1. Objetivo

Este documento explica como configurar, executar e validar o ProconBot Jacarei localmente. Ele cobre o chatbot via WhatsApp, a API de apoio, o painel frontend administrativo, o banco de dados, o RAG e os comandos de teste.

## 2. Pre-requisitos

| Requisito | Versao / Observacao |
|---|---|
| Git | Necessario para clonar o repositorio |
| Node.js | 22.x |
| npm | Instalado junto com o Node.js |
| WhatsApp | Necessario para autenticar o bot via QR Code ou codigo de pareamento |
| MongoDB | Opcional para o chatbot basico; necessario para persistencia e API REST completa |
| Chave Gemini | Opcional; habilita embeddings, busca semantica e LLM |
| Docker | Opcional para execucao containerizada |

No Windows PowerShell, se `npm` for bloqueado pela politica de execucao, use `npm.cmd` nos comandos. Exemplo: `npm.cmd install`.

## 3. Baixar o Projeto

```bash
git clone -b develop https://github.com/innocode-solutions/abp_6dsm.git
cd abp_6dsm
npm install
```

## 4. Configurar Variaveis de Ambiente

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

No PowerShell:

```powershell
Copy-Item .env.example .env
```

Depois edite o `.env` conforme o modo de execucao desejado.

### 4.1 Variaveis Principais

| Variavel | Quando usar | Descricao |
|---|---|---|
| `MONGODB_URI` | Persistencia/API REST | URI do MongoDB local, Atlas ou Railway |
| `MONGODB_DB_NAME` | Persistencia/API REST | Nome do banco, por exemplo `proconbot_jacarei` |
| `GEMINI_API_KEY` | RAG semantico/LLM | Chave do Google AI Studio |
| `WHATSAPP_PHONE_NUMBER` | Pareamento por codigo | Numero em formato internacional, exemplo `5511999999999` |
| `WHATSAPP_AUTH_PATH` | Sessao WhatsApp | Diretorio da sessao, padrao `.wwebjs_auth` |
| `HTTP_PORT` | Servidor HTTP do bot | Porta do `/health` e `/api/kpi`, padrao `3000` |
| `PORT` | API REST administrativa | Porta usada por `npm run api:dev`, padrao `3000` |
| `JWT_SECRET` | API/admin/KPI | Segredo para assinar tokens JWT |
| `CHATBOT_API_KEY` | Agendamento via bot | Chave enviada pelo bot no header `x-api-key` |
| `AGENDAMENTO_API_BASE_URL` | Agendamento via bot | URL base da API REST de agendamentos |
| `BCRYPT_SALT_ROUNDS` | API/admin | Custo de hash das senhas administrativas |

Observacao: se for usar agendamento pela conversa do bot, inclua `CHATBOT_API_KEY` no `.env` mesmo que ele ainda nao apareca no exemplo da sua branch local. O codigo atual da API e do bot consome essa variavel.

### 4.2 Exemplo de `.env` para Chatbot Basico

```env
HTTP_PORT=3000
WHATSAPP_PHONE_NUMBER=5511999999999
```

Nesse modo, o bot usa sessao em memoria e busca por palavra-chave no CDC.

### 4.3 Exemplo de `.env` com MongoDB e RAG

```env
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=proconbot_jacarei
HTTP_PORT=3000
GEMINI_API_KEY=sua_chave_gemini
WHATSAPP_PHONE_NUMBER=5511999999999
JWT_SECRET=sua_chave_jwt_longa
```

Para gerar um `JWT_SECRET` forte:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4.4 Exemplo para Bot + API de Agendamento

Quando bot e API REST rodam ao mesmo tempo no mesmo computador, use portas diferentes:

```env
# Servidor HTTP que sobe junto com o bot
HTTP_PORT=3000

# API REST administrativa/de agendamentos
PORT=3001

MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=proconbot_jacarei
JWT_SECRET=sua_chave_jwt_longa
CHATBOT_API_KEY=uma_chave_compartilhada_entre_bot_e_api
AGENDAMENTO_API_BASE_URL=http://localhost:3001
```

## 5. Validar Banco de Dados

Com o MongoDB em execucao e `MONGODB_URI` configurado:

```bash
npm run db:ping
```

Para inspecionar colecoes:

```bash
npm run db:inspect
```

Para inserir dados de exemplo do backend principal:

```bash
npm run db:seed-sample
```

## 6. Gerar Indice RAG do CDC

Se `GEMINI_API_KEY` estiver configurada, gere ou atualize o indice semantico:

```bash
npm run rag:index
```

O script le `docs/knowledge/cdc.md` e atualiza o indice usado pelo RAG. Sem esse passo, o sistema ainda pode subir, mas pode cair para busca por palavra-chave ate o indice estar disponivel.

## 7. Executar o Chatbot

### 7.1 Modo Desenvolvimento

```bash
npm run dev
```

Esse comando inicia:

- o bot WhatsApp;
- o processamento de fluxos, RAG e agendamento, conforme variaveis configuradas;
- o servidor HTTP do bot com `/health` e, quando houver historico, `/api/kpi`.

### 7.2 Autenticar o WhatsApp

Na primeira execucao, acompanhe o terminal.

Opcoes de autenticacao:

- QR Code: escaneie pelo WhatsApp em `Dispositivos conectados > Conectar um dispositivo`;
- Codigo de pareamento: defina `WHATSAPP_PHONE_NUMBER`; o codigo aparece no terminal.

A sessao fica salva em `.wwebjs_auth/` por padrao. Em producao, use volume persistente ou `RemoteAuth` com MongoDB para evitar novo login a cada deploy.

### 7.3 Modo Producao Local

```bash
npm run build
npm start
```

## 8. Executar a API REST Administrativa e de Agendamentos

Essa API e usada para login administrativo, configuracoes, agenda e chamadas do chatbot para agendamento.

Configure no `.env`:

```env
PORT=3001
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=proconbot_jacarei
JWT_SECRET=sua_chave_jwt_longa
CHATBOT_API_KEY=uma_chave_para_o_bot
```

Inicie a API:

```bash
npm run api:dev
```

Rotas principais:

| Metodo | Rota | Autenticacao | Finalidade |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Publica | Login administrativo |
| `GET` | `/api/v1/agendamentos/servicos` | `x-api-key` | Listar servicos para o bot |
| `GET` | `/api/v1/agendamentos/horarios-disponiveis` | `x-api-key` | Listar horarios |
| `POST` | `/api/v1/agendamentos/pre-reservas` | `x-api-key` | Criar pre-reserva |
| `POST` | `/api/v1/agendamentos/agendamentos` | `x-api-key` | Confirmar agendamento |
| `GET` | `/api/v1/agendamentos/admin/agenda` | Bearer JWT | Consultar agenda administrativa |

### 8.1 Criar Primeiro Admin

Com MongoDB configurado:

```bash
ADMIN_EMAIL=admin@procon.test ADMIN_SENHA=senha-forte npm run api:seed-admin
```

No PowerShell:

```powershell
$env:ADMIN_EMAIL="admin@procon.test"
$env:ADMIN_SENHA="senha-forte"
npm.cmd run api:seed-admin
```

Depois use `POST /api/v1/auth/login` com o email e senha criados.

## 9. Executar o Frontend Administrativo

O frontend fica em `frontend/` e apresenta o painel administrativo integrado ao backend.

```bash
cd frontend
npm install
npm run dev
```

Abra a URL exibida pelo Vite, normalmente:

```txt
http://localhost:5173
```

Acesso ao painel:

- use uma conta administrativa criada na API;
- a autenticacao fica salva no navegador durante a sessao;
- as telas exibem dados obtidos do backend conforme os endpoints disponiveis.

Telas disponiveis:

- `/login`;
- `/dashboard`;
- `/conversas`;
- `/agendamentos`;
- `/usuarios`;
- `/mensagens-nao-entendidas`;
- `/base-de-conhecimento`;
- `/relatorios`;
- `/configuracoes`.

## 10. Executar Testes e Validacoes

```bash
npm run typecheck
npm run test:run
npm run build
```

Tambem existe:

```bash
npm test
```

Esse comando abre o Vitest em modo interativo/watch.

## 11. Executar com Docker

Build da imagem:

```bash
docker build -f docker/Dockerfile -t proconbot-jacarei .
```

Executar usando `.env`:

```bash
docker run --env-file .env -p 3000:3000 proconbot-jacarei
```

O Dockerfile ja inclui Chromium, necessario para o `whatsapp-web.js`.

## 12. Deploy em Nuvem

O projeto possui configuracao para Railway:

- `railway.toml`;
- `docker/Dockerfile`;
- `RELEASE.md`.

Variaveis comuns em producao:

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://usuario:senha@cluster/proconbot_jacarei
MONGODB_DB_NAME=proconbot_jacarei
GEMINI_API_KEY=sua_chave_gemini
JWT_SECRET=sua_chave_jwt_longa
CHATBOT_API_KEY=sua_chave_do_chatbot
AGENDAMENTO_API_BASE_URL=https://sua-api.railway.app
WHATSAPP_PHONE_NUMBER=5511999999999
WHATSAPP_AUTH_PATH=/data/.wwebjs_auth
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

## 13. Problemas Comuns

| Sintoma | Possivel causa | Como resolver |
|---|---|---|
| Bot pede login sempre | Sessao WhatsApp nao persistida | Preserve `.wwebjs_auth/` ou use MongoDB/RemoteAuth |
| RAG nao usa semantica | `GEMINI_API_KEY` ausente ou indice nao gerado | Configure a chave e rode `npm run rag:index` |
| Agendamento nao aparece no bot | `AGENDAMENTO_API_BASE_URL` ou `CHATBOT_API_KEY` ausente | Configure as variaveis e suba a API REST |
| Conflito de porta | Bot e API usando `3000` | Use `HTTP_PORT=3000` e `PORT=3001` |
| API REST nao inicia | Variaveis obrigatorias ausentes | Configure `MONGODB_URI`, `JWT_SECRET` e `CHATBOT_API_KEY` |
| Frontend nao conecta ao backend | API fora do ar, URL incorreta ou credenciais invalidas | Verifique a API, as variaveis de ambiente e o login administrativo |

## 14. Comandos Uteis

| Comando | Descricao |
|---|---|
| `npm run dev` | Inicia o chatbot em desenvolvimento |
| `npm run build` | Compila bot e API |
| `npm start` | Executa a versao compilada do bot |
| `npm run api:dev` | Inicia a API REST administrativa/de agendamentos |
| `npm run api:seed-admin` | Cria ou atualiza o primeiro administrador |
| `npm run db:ping` | Testa conexao com MongoDB |
| `npm run db:inspect` | Inspeciona colecoes do banco |
| `npm run rag:index` | Gera indice semantico do CDC |
| `npm run typecheck` | Valida tipos TypeScript |
| `npm run test:run` | Executa testes automatizados |
| `npm run build:bot` | Compila o bot |
| `npm run build:api` | Compila a API |
