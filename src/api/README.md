# ProconBot — API HTTP (ERP / Dashboard de KPIs)

Servidor Express separado do bot WhatsApp, responsável por expor métricas de atendimento.

---

## Estrutura dos arquivos

```
src/api/
├── dev-server.ts          → script de desenvolvimento isolado (sem Mongo, sem WhatsApp)
├── server-http.ts         → factory do Express (helmet, rate-limit, rotas)
├── middleware/
│   └── auth.middleware.ts → validação de Bearer JWT
├── routes/
│   └── kpi.routes.ts      → GET /api/kpi/dashboard
└── validation/
    └── dashboard.schema.ts → sanitização Zod dos query params
```

---

## Pré-requisitos

Variáveis obrigatórias no `.env` (copie de `.env.example`):

```env
JWT_SECRET=coloque_uma_chave_longa_e_aleatoria_aqui
HTTP_PORT=3000
```

Para gerar um `JWT_SECRET` seguro:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Modo 1 — Desenvolvimento local (sem MongoDB)

Usa um repositório em memória com dados de exemplo. Ideal para testar as rotas rapidamente.

### Iniciar o servidor

```bash
npm run api:dev
```

O terminal imprimirá:

- A URL base (`http://localhost:3000`)
- Um **Bearer token JWT** válido por 1 hora, pronto para copiar
- Um comando `curl` de exemplo completo

### Rotas disponíveis

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| `GET` | `/health` | Não | Verifica se o servidor está no ar |
| `GET` | `/api/kpi/dashboard` | **Sim** | Retorna métricas agregadas por usuário |

### Testar com curl

```bash
# 1. Health (público)
curl http://localhost:3000/health

# 2. Dashboard sem token → 401
curl http://localhost:3000/api/kpi/dashboard?users=5511999990001

# 3. Dashboard com token → 200
curl -H "Authorization: Bearer SEU_TOKEN_DO_TERMINAL" \
  "http://localhost:3000/api/kpi/dashboard?users=5511999990001,5511999990002"

# 4. Parâmetro inválido (tentativa de injeção) → 400
curl -H "Authorization: Bearer SEU_TOKEN_DO_TERMINAL" \
  "http://localhost:3000/api/kpi/dashboard?users=id%24where"
```

### Testar pelo browser (console DevTools)

Abra qualquer aba do `localhost:3000` e cole no console:

```javascript
// Substitua TOKEN pelo valor impresso no terminal
const TOKEN = "cole_aqui_o_token";

fetch("http://localhost:3000/api/kpi/dashboard?users=5511999990001,5511999990002", {
  headers: { "Authorization": `Bearer ${TOKEN}` }
})
  .then(r => r.json())
  .then(console.log);
```

### Testar com Insomnia / Postman

1. Crie uma requisição `GET`
2. URL: `http://localhost:3000/api/kpi/dashboard?users=5511999990001,5511999990002`
3. Aba **Auth** → tipo **Bearer Token** → cole o token do terminal
4. Envie e veja o JSON com `totalMessages`, `totalByUser` e `lastUpdated`

### Respostas esperadas

**`GET /health` — 200**
```json
{ "status": "ok", "timestamp": "2026-05-11T23:29:57.971Z" }
```

**`GET /api/kpi/dashboard` sem token — 401**
```json
{ "error": "Acesso negado: token não fornecido." }
```

**`GET /api/kpi/dashboard?users=5511999990001,5511999990002` com token — 200**
```json
{
  "totalMessages": 3,
  "totalByUser": [
    { "userId": "5511999990001", "count": 2 },
    { "userId": "5511999990002", "count": 1 }
  ],
  "totalExtractions": 0,
  "lastUpdated": "2026-05-11T23:30:41.113Z"
}
```

**`GET /api/kpi/dashboard?users=id%24where` — 400 (bloqueio de injeção)**
```json
{
  "error": "Parâmetros inválidos.",
  "details": ["Parâmetro 'users' contém caracteres inválidos."]
}
```

**Rota inexistente — 404**
```json
{ "error": "Rota não encontrada." }
```

---

## Modo 2 — Produção com MongoDB (Railway)

Quando `MONGODB_URI` estiver configurado, o servidor principal (`npm run dev` / `npm start`) sobe **ambos**:
- Bot WhatsApp (Puppeteer)
- Servidor HTTP na porta `HTTP_PORT` (padrão: `3000`)

O `historyRepository` é compartilhado — os dados reais do MongoDB Atlas / Railway MongoDB são consultados.

### Variáveis de ambiente necessárias na Railway

```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/proconbot_jacarei
MONGODB_DB_NAME=proconbot_jacarei
JWT_SECRET=chave_gerada_com_crypto_randombytes_64
HTTP_PORT=3000
```

### Como gerar um token JWT para acessar a API em produção

Enquanto não há endpoint de login implementado, gere o token manualmente via Node:

```bash
node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { sub: 'admin', role: 'admin' },
  process.env.JWT_SECRET,
  { expiresIn: '8h' }
);
console.log(token);
"
```

Ou pelo REPL:

```bash
node
> require('dotenv/config')
> const jwt = require('jsonwebtoken')
> jwt.sign({ sub: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' })
```

### Consultando dados reais do MongoDB via API

```bash
# IDs no MongoDB são números de WhatsApp no formato internacional + @c.us
# Ex.: 5511999990001@c.us → use apenas a parte numérica: 5511999990001

curl -H "Authorization: Bearer SEU_JWT" \
  "https://seu-app.railway.app/api/kpi/dashboard?users=5511999990001,5511999990002"
```

### Inspecionando o banco diretamente

```bash
# Ver coleções e contagens
npm run db:inspect

# Testar conexão
npm run db:ping
```

---

## Segurança implementada

| Camada | Mecanismo | O que protege |
|--------|-----------|---------------|
| Cabeçalhos HTTP | `helmet` (CSP, HSTS, frameguard, noSniff) | XSS, clickjacking, MIME-sniff |
| Rate limiting global | 100 req / 15 min por IP | Scraping, força-bruta |
| Rate limiting KPI | 30 req / 1 min por IP | Enumeração de usuários |
| Tamanho do body | `10kb` máximo | Payload bomb |
| Validação de input | `zod` + whitelist regex | Injeção NoSQL, caracteres de controle |
| Autenticação | JWT Bearer (`jsonwebtoken`) | Acesso não autorizado |

---

## Limites de validação do `/api/kpi/dashboard`

| Regra | Valor |
|-------|-------|
| Tamanho máximo do param `users` | 200 caracteres |
| Caracteres permitidos por userId | `a-z A-Z 0-9 + @ _ -` |
| Tamanho máximo por userId | 50 caracteres |
| Máximo de usuários por requisição | 20 |
