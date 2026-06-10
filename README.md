<span id="topo"></span>

<h1 align="center"> ProconBot Jacareí </h1>

<h2 align="center"> FATEC Professor Francisco de Moura, Jacareí - 6º Semestre DSM 2026 </h2>

<p align="center">
  <a href="#sobre">Sobre</a> |
  <a href="#visao">Visão do Produto</a> |
  <a href="#inicializacao">Como Inicializar</a> 
  <a href="#backlog">Product Backlog</a> |
  <a href="#sprints">Sprints</a> |
  <a href="#fluxos">Fluxos</a> |
  <a href="#equipe">Equipe</a>
</p>

---

<span id="sobre"></span>

<h1 align="center">Sobre</h1>

<p>

Este projeto foi desenvolvido pelos alunos do 6º semestre de Desenvolvimento de Software Multiplataforma (DSM) da Fatec de Jacareí como parte da Aprendizagem Baseada em Projeto (ABP). O **ProconBot Jacareí** é um chatbot inteligente que auxilia consumidores a obter orientações iniciais sobre seus direitos utilizando o WhatsApp como canal principal de comunicação.

</p>

<p>

A solução combina fluxos decisórios baseados nas orientações do PROCON com técnicas de **Processamento de Linguagem Natural (PLN)** e **RAG (Retrieval Augmented Generation)**. A base de conhecimento utilizada pelo sistema inclui as **FAQs do PROCON** e o **Código de Defesa do Consumidor (CDC)**, permitindo recuperar informações relevantes para orientar os usuários.

</p>

<p>

O sistema utiliza **Node.js e TypeScript no backend**, integração com **WhatsApp via whatsapp-web.js**, armazenamento de dados em banco relacional e infraestrutura em **computação em nuvem**, permitindo registrar interações, auditar respostas e gerar orientações claras aos consumidores.

</p>

---

<span id="visao"></span>

<h1 align="center">Visão do Produto</h1>

<h3>Descrição</h3>

Um chatbot inteligente acessível via **WhatsApp** que fornece orientação inicial sobre direitos do consumidor, utilizando:

- 🔀 Fluxos decisórios baseados nas orientações do PROCON  
- 📚 Recuperação de conhecimento (**RAG**) baseada nas FAQs e no Código de Defesa do Consumidor  
- 🧠 Técnicas de **PLN** para interpretação de mensagens  
- ✍️ Geração controlada de respostas com **LLM**  
- ☁️ Infraestrutura em nuvem para execução e persistência  

<h3>Objetivo</h3>

Auxiliar cidadãos a entender seus direitos e os próximos passos para resolver problemas de consumo.

---

<span id="inicializacao"></span>

<h1 align="center">Como Inicializar o Projeto</h1>

<p>

Esta seção descreve como executar o <strong>backend</strong> do ProconBot Jacareí localmente. O frontend do painel administrativo encontra-se em <code>frontend/</code>, porém está <strong>mockado</strong> e não é necessário para rodar o chatbot no momento.

</p>

<h3>Pré-requisitos</h3>

| Requisito | Versão / observação |
|-----------|---------------------|
| [Node.js](https://nodejs.org/) | 22.x (mesma versão usada no CI e no Docker) |
| [npm](https://www.npmjs.com/) | Incluso com o Node.js |
| MongoDB | Opcional — habilita histórico, sessões e índice RAG no banco |
| Chave Gemini | Opcional — habilita busca semântica (RAG) e respostas com LLM |

<h3>Estrutura relevante do backend</h3>

```
abp_6dsm/
├── src/                 # Código TypeScript (bot, fluxos, RAG, WhatsApp)
├── docs/knowledge/      # Base do CDC em markdown
├── .env.example         # Modelo de variáveis de ambiente
├── package.json         # Scripts npm do backend
└── docker/Dockerfile    # Imagem para deploy (Node + Chromium)
```

<h3>Passo a passo</h3>

**1. Clonar o repositório e instalar dependências**

```bash
git clone https://github.com/innocode-solutions/abp_6dsm.git
cd abp_6dsm
npm install
```

No Windows (PowerShell), se `npm` for bloqueado pela política de execução, use `npm.cmd` nos comandos abaixo (ex.: `npm.cmd install`, `npm.cmd run dev`).

**2. Configurar variáveis de ambiente**

Copie o arquivo de exemplo e ajuste os valores na raiz do projeto:

```bash
cp .env.example .env
```

No PowerShell: `Copy-Item .env.example .env`

| Variável | Obrigatória | Descrição |
|----------|:-----------:|-----------|
| `MONGODB_URI` | Não | URI do MongoDB. Sem ela, o bot funciona com sessão em memória |
| `MONGODB_DB_NAME` | Não | Nome do banco (padrão: extraído da URI) |
| `GEMINI_API_KEY` | Não | Chave da [Google AI Studio](https://aistudio.google.com/apikey) para RAG + LLM |
| `WHATSAPP_PHONE_NUMBER` | Não | Número em formato internacional para pareamento por código (ex.: `5511999999999`) |

**3. (Opcional) Subir o MongoDB e validar a conexão**

Com o MongoDB em execução (local, Docker ou Atlas), defina `MONGODB_URI` no `.env` e execute:

```bash
npm run db:ping
```

Se a conexão estiver correta, o terminal exibirá `Ping OK: conexão com MongoDB validada.`

**4. (Opcional) Gerar o índice semântico do CDC**

Necessário para **busca semântica** quando `GEMINI_API_KEY` estiver definida (o bot sobe sem esse passo, mas cai em busca por palavra-chave até o índice existir). O script lê `docs/knowledge/cdc.md`, gera embeddings e salva em `src/knowledge/cdc-index.json` (e no MongoDB, se `MONGODB_URI` estiver definida):

```bash
npm run rag:index
```

**5. Iniciar o servidor**

Modo desenvolvimento (TypeScript direto via `tsx`, sem build prévio):

```bash
npm run dev
```

Modo produção local:

```bash
npm run build
npm start
```

**6. Autenticar o WhatsApp**

Na primeira execução, o `whatsapp-web.js` solicita login. Acompanhe o terminal:

- **QR Code** — exibido no console; escaneie em *WhatsApp → Dispositivos conectados → Conectar um dispositivo*.
- **Código de pareamento** — defina `WHATSAPP_PHONE_NUMBER` no `.env`; o código de 8 caracteres aparecerá no log. No celular, use *Conectar com número de telefone*.

Após autenticado, a sessão fica em `.wwebjs_auth/` (ou no caminho definido em `WHATSAPP_AUTH_PATH`). Nas próximas execuções, o login costuma ser reutilizado automaticamente.

Quando tudo estiver certo, você verá mensagens como `[WhatsApp] Conectado e pronto para uso.` e `Servidor iniciado com arquitetura de provedores e persistência.`

<h3>Scripts úteis do backend</h3>

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Sobe o bot em modo desenvolvimento |
| `npm run build` | Compila TypeScript para `dist/` |
| `npm start` | Executa a versão compilada |
| `npm test` / `npm run test:run` | Executa testes com Vitest |
| `npm run typecheck` | Verifica tipos sem gerar build |
| `npm run db:ping` | Testa conexão com o MongoDB |
| `npm run db:inspect` | Inspeciona coleções do banco |
| `npm run db:seed-sample` | Insere dados de exemplo |
| `npm run rag:index` | Gera/atualiza índice vetorial do CDC |

<h3>Execução com Docker (opcional)</h3>

Para ambiente containerizado (inclui Chromium para o WhatsApp):

```bash
docker build -f docker/Dockerfile -t proconbot-jacarei .
docker run --env-file .env proconbot-jacarei
```

Em produção, o deploy utiliza [Railway](https://railway.app/) com as variáveis descritas em `.env.example` e em `RELEASE.md`.

<h3>Comportamento sem dependências opcionais</h3>

- Sem `MONGODB_URI`: fluxos e conversas funcionam com **sessão em memória**; histórico não é persistido.
- Sem `GEMINI_API_KEY`: o sistema usa **busca por palavra-chave** no CDC, sem LLM nem embeddings.
- Com `GEMINI_API_KEY` mas sem índice (`npm run rag:index` ou dados no MongoDB): o LLM pode responder, porém a busca no CDC permanece por **palavra-chave** até o índice ser gerado.

---

<span id="backlog"></span>

<h1 align="center">Product Backlog</h1>

| ID   | Req. | User Story                                       | Prioridade | Story Points |
|------|------|--------------------------------------------------|:----------:|:------------:|
| US01 | RF01 | Integrar chatbot ao WhatsApp                     | P0 | 5 |
| US02 | RF01 | Receber mensagens de usuários                    | P0 | 3 |
| US03 | RF01, RF04 | Enviar respostas ao usuário                | P0 | 3 |
| US04 | RF03 | Gerenciar sessões de conversa                    | P0 | 3 |
| US05 | RF02, RF03 | Criar motor de fluxo decisório            | P0 | 5 |
| US06 | RF02, RF03, RF04 | Implementar fluxo de cobrança indevida | P0 | 3 |
| US07 | RF02, RF03, RF04 | Implementar fluxo de empréstimo não reconhecido | P0 | 3 |
| US08 | RF02, RF03, RF04 | Implementar fluxo de direito de arrependimento | P0 | 3 |
| US09 | RF02, RF03, RF04 | Implementar fluxo de cancelamento de plano | P1 | 3 |
| US10 | RF02, RF03, RF04 | Implementar fluxo de garantia de produto | P1 | 3 |
| US11 | RF06 | Persistir histórico de mensagens                 | P0 | 3 |
| US12 | RF02, RF03 | Estruturar base FAQ do PROCON              | P0 | 3 |
| US13 | RF05 | Implementar ingestão do CDC PDF                  | P1 | 5 |
| US14 | RF05 | Realizar chunking do CDC                         | P1 | 3 |
| US15 | RF05 | Gerar embeddings da base de conhecimento         | P1 | 5 |
| US16 | RF05 | Implementar busca semântica (RAG)                | P1 | 5 |
| US17 | RF02, RF03 | Classificar intenção da mensagem           | P1 | 5 |
| US18 | RF03 | Extrair entidades relevantes                     | P2 | 3 |
| US19 | RF05, RNF05 | Integrar LLM para resposta final          | P1 | 3 |
| US20 | RF06 | Implementar logs de auditoria                    | P1 | 3 |
| US21 | RNF02 | Criar deploy em nuvem                           | P0 | 5 |
| US22 | RNF02 | Criar container Docker                          | P1 | 3 |
| US23 | RNF02 | Criar pipeline CI/CD                            | P2 | 3 |
| US24 | RF04, RNF04 | Implementar fallback para atendimento presencial | P1 | 2 |
| US25 | RNF04, RNF05 | Adicionar aviso de uso de IA             | P1 | 1 |
| US26 | RF06 | Criar dashboard simples de métricas              | P2 | 5 |
| US27 | RNF02 | Implementar monitoramento e logs                | P2 | 3 |
| US28 | RNF02 | Criar testes básicos                            | P2 | 3 |
| US29 | RNF01, RNF03 | Documentar arquitetura                   | P2 | 2 |
| US30 | RNF01 | Criar documentação de uso                       | P2 | 2 |
| US31 | RNF02, RNF03 | Configurar banco de dados                | P0 | 5 |
| US32 | RF03, RF06 | Persistir sessões no banco                 | P0 | 3 |
| US33 | RF01, RF03 | Criar fluxo de agendamento                 | P1 | 5 |
| US34 | RF03, RF06 | Listar horários disponíveis                | P1 | 5 |
| US35 | RF06, RNF03 | Persistir agendamentos                    | P1 | 3 |
| US36 | RF04 | Confirmar agendamento ao usuário                 | P1 | 2 |
| US37 | RF03, RF06 | Cancelar ou reagendar atendimento         | P2 | 3 |

---

<span id="sprints"></span>

<h1 align="center">Sprints</h1>

<details>
<summary><h3>Sprint 1 — MVP do Chatbot</h3></summary>

**Objetivo:**  
Implementar a comunicação via WhatsApp e os primeiros fluxos de atendimento do PROCON.

**Backlog da Sprint:**

| ID | Req. | User Story | Pontos |
|----|------|------------|-------|
| US01 | RF01 | Integrar chatbot ao WhatsApp | 5 |
| US02 | RF01 | Receber mensagens de usuários | 3 |
| US03 | RF01, RF04 | Enviar respostas ao usuário | 3 |
| US04 | RF03 | Gerenciar sessões de conversa | 3 |
| US05 | RF02, RF03 | Criar motor de fluxo decisório | 5 |
| US06 | RF02, RF03, RF04 | Fluxo cobrança indevida | 3 |
| US07 | RF02, RF03, RF04 | Fluxo empréstimo não reconhecido | 3 |
| US08 | RF02, RF03, RF04 | Fluxo direito de arrependimento | 3 |
| US09 | RF02, RF03, RF04 | Fluxo cancelamento de plano | 3 |

<br>

<div align="center">
  <p><i>Gráfico de Burndown do Sprint 1</i></p>
  <img width="1366" height="766" alt="Sprint 1 - Burndown" src="https://github.com/user-attachments/assets/1a14ca77-bad2-42d5-8d5e-afa28d0f290a" />
</div>

---

**Retrospectiva — Sprint 1**
 
**✅ O que foi bem**
- Os fluxos decisórios foram bem definidos e receberam feedback positivo do professor.
- A integração com WhatsApp via whatsapp-web.js foi entregue dentro do prazo.
- A comunicação entre os membros da equipe foi efetiva durante toda a sprint.
- O motor de fluxo decisório atendeu os casos de uso previstos (cobrança indevida, empréstimo não reconhecido, arrependimento e cancelamento de plano).
**⚠️ O que pode melhorar**
- A estimativa de story points precisa ser revisada antes do início de cada sprint para garantir coerência com o gráfico de burndown.
- A documentação de setup do projeto (como subir localmente) precisa ser iniciada em paralelo ao desenvolvimento, não apenas ao final.
- O gráfico de burndown não refletiu os story points reais da sprint — deve partir do total de pontos do backlog, não da quantidade de tarefas.

</details>

<details>
<summary><h3>Sprint 2 — Inteligência + Persistência</h3></summary>

**Objetivo:**  
Implementar base de conhecimento, interpretação de linguagem e persistência de dados.

**Backlog da Sprint:**

| ID | Req. | User Story | Pontos |
|----|------|------------|-------|
| US10 | RF02, RF03, RF04 | Fluxo garantia de produto | 3 |
| US11 | RF06 | Persistir histórico de mensagens | 3 |
| US12 | RF02, RF03 | Estruturar base FAQ | 3 |
| US13 | RF05 | Ingestão CDC PDF | 5 |
| US14 | RF05 | Chunking CDC | 3 |
| US15 | RF05 | Gerar embeddings | 5 |
| US16 | RF05 | Implementar busca semântica (RAG) | 5 |
| US17 | RF02, RF03 | Classificar intenção | 5 |
| US18 | RF03 | Extrair entidades | 3 |
| US31 | RNF02, RNF03 | Configurar banco de dados | 5 |
| US32 | RF03, RF06 | Persistir sessões no banco | 3 |

<br>

<div align="center">
  <p><i>Gráfico de Burndown do Sprint 2</i></p>
  <img width="1366" height="766" alt="Sprint 1 - Burndown" src="https://github.com/user-attachments/assets/1c00a756-d64b-4881-b014-557a3af94a34" />
</div>

---
 
**Retrospectiva — Sprint 2**
 
**✅ O que foi bem**
- A estruturação da base FAQ do PROCON foi concluída e servirá como base sólida para as respostas do bot.
- A pipeline de RAG (ingestão do CDC → chunking → embeddings → busca semântica) foi implementada com sucesso.
- A equipe conseguiu lidar com tecnologias novas (embeddings, busca vetorial) dentro do prazo da sprint.
**⚠️ O que pode melhorar**
- A comunicação decaiu em relação a sprint anterior.

</details>

<details>
<summary><h3>Sprint 3 — Infraestrutura Cloud e Governança</h3></summary>

**Objetivo:**  
Realizar deploy em nuvem, implementar observabilidade, governança, documentação e fluxo de agendamento.

**Backlog da Sprint:**

| ID | Req. | User Story | Pontos |
|----|------|------------|-------|
| US19 | RF05, RNF05 | Integrar LLM para resposta final | 3 |
| US20 | RF06 | Logs auditoria | 3 |
| US21 | RNF02 | Deploy em nuvem | 5 |
| US22 | RNF02 | Container Docker | 3 |
| US23 | RNF02 | Pipeline CI/CD | 3 |
| US24 | RF04, RNF04 | Fallback atendimento presencial | 2 |
| US25 | RNF04, RNF05 | Aviso uso IA | 1 |
| US26 | RF06 | Dashboard métricas | 5 |
| US27 | RNF02 | Monitoramento | 3 |
| US28 | RNF02 | Testes | 3 |
| US29 | RNF01, RNF03 | Documentação arquitetura | 2 |
| US30 | RNF01 | Documentação uso | 2 |
| US33 | RF01, RF03 | Criar fluxo de agendamento | 5 |
| US34 | RF03, RF06 | Listar horários disponíveis | 5 |
| US35 | RF06, RNF03 | Persistir agendamentos | 3 |
| US36 | RF04 | Confirmar agendamento ao usuário | 2 |
| US37 | RF03, RF06 | Cancelar ou reagendar atendimento | 3 |

</details>
<span id="equipe"></span>

<h1 align="center">Equipe</h1> <div align="center">
 
| Função          | Nome                     | GitHub                                                       | LinkedIn |
|-----------------|--------------------------|--------------------------------------------------------------|----------|
| Product Owner   | Mauro do Prado Santos    | [![GitHub Badge](https://img.shields.io/badge/GitHub-111217?style=flat-square&logo=github&logoColor=white)](https://github.com/omaurosantos) | [![Linkedin Badge](https://img.shields.io/badge/Linkedin-blue?style=flat-square&logo=Linkedin&logoColor=white)](https://www.linkedin.com/in/mauro-do-prado-santos-350b2720a/) |
| Scrum Master    | Vitor Cezar de Souza     | [![GitHub Badge](https://img.shields.io/badge/GitHub-111217?style=flat-square&logo=github&logoColor=white)](https://github.com/vooshybee) | [![Linkedin Badge](https://img.shields.io/badge/Linkedin-blue?style=flat-square&logo=Linkedin&logoColor=white)](https://www.linkedin.com/in/vitor-souza-29077228b/) |
| Dev Team        | Igor Fonseca             | [![GitHub Badge](https://img.shields.io/badge/GitHub-111217?style=flat-square&logo=github&logoColor=white)](https://github.com/Igor-Fons) | [![Linkedin Badge](https://img.shields.io/badge/Linkedin-blue?style=flat-square&logo=Linkedin&logoColor=white)](https://www.linkedin.com/in/igor-fonseca-84277226a/) |
| Dev Team    | Jonatas Filipe Carvalho  | [![GitHub Badge](https://img.shields.io/badge/GitHub-111217?style=flat-square&logo=github&logoColor=white)](https://github.com/filipejonatas) | [![Linkedin Badge](https://img.shields.io/badge/Linkedin-blue?style=flat-square&logo=Linkedin&logoColor=white)](https://www.linkedin.com/in/jonatas-filipe-aa4534165/) |
| Dev Team        | Samuel Lucas Vieira de Melo | [![GitHub Badge](https://img.shields.io/badge/GitHub-111217?style=flat-square&logo=github&logoColor=white)](https://github.com/SamuelLucasVieira) | [![Linkedin Badge](https://img.shields.io/badge/Linkedin-blue?style=flat-square&logo=Linkedin&logoColor=white)](https://www.linkedin.com/in/samuel-lucas-7a3256144/) |
| Dev Team        | Vinicius Barbosa Ferndandes | [![GitHub Badge](https://img.shields.io/badge/GitHub-111217?style=flat-square&logo=github&logoColor=white)](https://github.com/Viniciusfernandes2) | [![Linkedin Badge](https://img.shields.io/badge/Linkedin-blue?style=flat-square&logo=Linkedin&logoColor=white)](https://www.linkedin.com/in/vinicius-fernandes-6088a323b/) |
</div>

---

<span id="fluxos"></span>

<h1 align="center">Fluxos Esperados</h1>

<details>
<summary><h3>1. Fluxo geral do sistema</h3></summary>
 
```mermaid
flowchart TD
    A[Usuário envia mensagem] --> B[MessagingProvider captura mensagem]
    B --> C[ProconBot Orquestrador]
    C --> D[Gerenciador de sessão]

    D --> E[Classificador de intenção]
    E --> F{Existe fluxo específico?}

    F -- Sim --> G[Motor de fluxo decisório]
    G --> H[Próxima pergunta ou orientação parcial]

    F -- Não --> I[Serviço de RAG]
    I --> J[Busca na base FAQ do PROCON]
    I --> K[Busca na base do CDC]

    J --> L[Montagem de contexto]
    K --> L

    H --> M[Compositor de resposta]
    L --> M

    M --> N{Precisa LLM?}
    N -- Sim --> O[LLM gera resposta em linguagem simples]
    N -- Não --> P[Resposta montada por template]

    O --> Q[Resposta final]
    P --> Q

    Q --> R[Salvar histórico e logs]
    R --> S[Enviar resposta ao usuário no WhatsApp]
```
</details>

<details>
<summary><h3>2. Fluxo da conversa no WhatsApp</h3></summary>

```mermaid
flowchart TD
    A[Usuário inicia conversa] --> B[Bot recebe mensagem]
    B --> C{Usuário já possui sessão ativa?}

    C -- Não --> D[Criar nova sessão]
    C -- Sim --> E[Recuperar sessão existente]

    D --> F[Analisar mensagem]
    E --> F

    F --> G{Mensagem corresponde a um fluxo?}

    G -- Sim --> H[Entrar ou continuar fluxo]
    H --> I[Fazer pergunta ao usuário]
    I --> J[Usuário responde]
    J --> K[Atualizar estado da sessão]
    K --> L{Fluxo finalizado?}

    L -- Não --> I
    L -- Sim --> M[Gerar orientação final]

    G -- Não --> N[Executar busca semântica RAG]
    N --> O[Recuperar FAQ + CDC]
    O --> P[Gerar resposta orientativa]

    M --> Q[Exibir aviso de uso orientativo]
    P --> Q
    Q --> R[Salvar histórico e auditoria]
    R --> S[Responder no WhatsApp]
```
</details>

<details>
<summary><h3>3. Arquitetura da Solução</h3></summary>

```mermaid
flowchart LR
    U[Usuário] --> M[Canal de Mensagem]
    M --> Prov[MessagingProvider - ex: WhatsApp]

    Prov --> BOT[ProconBot Core]

    BOT --> SES[Gerenciador de Sessão]
    BOT --> DEC[Motor de Fluxo]
    BOT --> PLN[Serviço de PLN]
    BOT --> RAG[Serviço de RAG]
    BOT --> LLM[Serviço de LLM]
    BOT --> AUD[Logs e Auditoria]

    PLN --> INT[Classificação de intenção]
    PLN --> ENT[Extração de entidades]

    RAG --> FAQ[Base FAQ PROCON]
    RAG --> CDC[Base CDC]
    FAQ --> DB[(PostgreSQL / pgvector)]
    CDC --> DB

    SES --> DB
    AUD --> DB

    API --> CLOUD[Infraestrutura em Nuvem]
```
</details>

<details>
<summary><h3>4. Fluxo interno do RAG</h3></summary>

```mermaid
flowchart TD
    A[Pergunta do usuário] --> B[Normalização do texto]
    B --> C[Classificação de intenção]
    C --> D[Extração de entidades]
    D --> E[Consulta vetorial]

    E --> F[Recuperar chunks da FAQ]
    E --> G[Recuperar chunks do CDC]

    F --> H[Re-ranking / seleção dos melhores trechos]
    G --> H

    H --> I[Montagem do contexto final]
    I --> J[LLM ou template de resposta]
    J --> K[Resposta orientativa ao usuário]
```
</details>

<details>
<summary><h3>5. Fluxo de um caso prático</h3></summary>

```mermaid
flowchart TD
    A[Usuário: Estão cobrando algo no meu cartão que não reconheço] --> B[Classificar intenção]
    B --> C[Intenção: cobrança indevida]

    C --> D[Iniciar fluxo de cobrança indevida]
    D --> E[Bot pergunta se usuário reconhece a contratação]
    E --> F[Bot pergunta se possui fatura ou comprovante]
    F --> G[Bot identifica documentos necessários]

    G --> H[Buscar FAQ relacionada]
    H --> I[Buscar artigos do CDC relacionados]

    I --> J[Montar orientação]
    J --> K[Gerar resposta clara]
    K --> L[Informar caráter orientativo]
    L --> M[Salvar histórico e logs]
    M --> N[Responder no WhatsApp]
```
</details>
