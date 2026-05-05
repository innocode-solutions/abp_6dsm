# Release — Versão Estável (develop)

Esta versão representa o estado estável do **ProconBot Jacareí** em execução no ambiente `develop` do Railway.

## Versão

`1.0.0` — Sprint 2 concluída

## O que está em produção

### Integração WhatsApp
- Conexão via `whatsapp-web.js` com autenticação `LocalAuth` (QR Code ou pareamento por código)
- Ignora mensagens do próprio bot, broadcasts de status e grupos
- Suporte a `WHATSAPP_PHONE_NUMBER` para pareamento por código

### Motor de Fluxo Decisório
- Engine genérico e determinístico (`FlowEngine`)
- Matching de fluxos por palavras-chave (`FlowMatcher`)
- Gerenciamento de sessão em memória (`InMemorySessionStore`)
- Formatação de respostas com perguntas, opções numeradas, recomendações e documentos

### Fluxos PROCON implementados
| Fluxo | Arquivo |
|---|---|
| Cobrança indevida / serviço não contratado | `src/flows/cobranca-indevida.json` |
| Empréstimo não reconhecido | `src/flows/emprestimo-nao-reconhecido.json` |
| Direito de arrependimento | `src/flows/direito-arrependimento.json` |
| Cancelamento de plano ou serviço | `src/flows/cancelamento-plano.json` |
| Garantia de produto | `src/flows/garantia-produto.json` |

### Persistência (MongoDB — opcional)
- Modelos Mongoose: `ChatMessage` e `ChatSession`
- Conexão opcional: se `MONGODB_URI` não estiver definida, o bot opera sem persistência
- Scripts utilitários: `db:ping` e `db:seed-sample`

### Infraestrutura
- Dockerfile multi-stage (`docker/Dockerfile`) com Node 22 + Chromium do sistema
- Configuração Railway via `railway.toml`
- Variáveis de ambiente documentadas em `.env.example`

### Testes
- Suíte Vitest cobrindo: bot, engine, todos os fluxos, WhatsApp provider e bootstrap do servidor
- Typecheck com `tsconfig.test.json`

## Variáveis de ambiente necessárias no Railway

| Variável | Obrigatória | Descrição |
|---|---|---|
| `MONGODB_URI` | Não | URI de conexão MongoDB (persistência opcional) |
| `MONGODB_DB_NAME` | Não | Nome do banco (padrão: extraído da URI) |
| `WHATSAPP_PHONE_NUMBER` | Não | Número para pareamento por código (ex: `5511999999999`) |
| `PUPPETEER_EXECUTABLE_PATH` | Sim (Railway) | Caminho do Chromium — definido automaticamente pelo Dockerfile |
| `NODE_ENV` | Não | `production` em produção |
