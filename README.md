# 🤖 Chatbot PROCON Jacareí – Orientação ao Consumidor via WhatsApp

## 📌 Sobre o Projeto

Este projeto tem como objetivo desenvolver um **chatbot para atendimento orientativo do PROCON de Jacareí**, permitindo que consumidores tirem dúvidas por meio do **WhatsApp**.

O sistema utiliza um **motor de fluxos decisórios baseado em tabela fornecida pelo PROCON**, conduzindo o usuário por perguntas sequenciais até a geração de uma orientação final.

Um **Modelo de Linguagem (LLM)** poderá ser utilizado exclusivamente para gerar o texto explicativo final, respeitando estritamente os limites e decisões previamente definidas pelo fluxo oficial.

⚠️ O chatbot possui caráter **orientativo**, não substituindo atendimento jurídico ou administrativo formal.

--- 

## 🧠 Visão Geral da Arquitetura
```
Usuário (WhatsApp)
↓
Webhook (API Backend)
↓
Gerenciador de Sessão
↓
Motor de Fluxos Decisórios
↓
Resumo Estruturado do Caso
↓
LLM (Geração Textual Controlada)
↓
Resposta ao Usuário
↓
Persistência e Logs
```

### 🔹 Princípios Arquiteturais

- Separação entre:
  - Integração com WhatsApp
  - Motor de fluxo decisório
  - Geração textual com LLM
- Estrutura modular
- Conformidade com LGPD
- Controle de alucinações do modelo de linguagem

## 🛠️ Tecnologias Utilizadas

### Backend
- Node.js ou Python (definir conforme implementação)
- Framework Web (Express / FastAPI)
- REST API

### Integração
- WhatsApp Business Platform (Cloud API)  
  *(ou simulador para ambiente acadêmico)*

### Persistência
- Banco de dados relacional ou NoSQL
- Registro de logs de interação

### Inteligência Artificial
- Modelo de Linguagem (LLM) para geração textual explicativa
- Prompt controlado e restritivo

# 📋 Product Backlog

O backlog foi estruturado com base nos requisitos funcionais e não funcionais do projeto.

## 🟦 ÉPICO 1 – Integração com WhatsApp

- US01 – Implementar Webhook para recebimento de mensagens
- US02 – Implementar envio de mensagens via API do WhatsApp
- US03 – Criar simulador de WhatsApp para testes locais

## 🟦 ÉPICO 2 – Motor de Fluxos Decisórios

- US04 – Estruturar modelo configurável de fluxo decisório (JSON/YAML)
- US05 – Implementar navegação sequencial entre perguntas
- US06 – Implementar controle de estado de sessão do usuário
- US07 – Gerar resumo estruturado ao final do fluxo

## 🟦 ÉPICO 3 – Geração de Resposta com LLM

- US08 – Criar prompt restritivo para geração textual
- US09 – Implementar geração de texto explicativo com base no resumo estruturado
- US10 – Garantir transparência sobre uso de LLM na resposta final
- US11 – Implementar validação para evitar extrapolação de informações

## 🟦 ÉPICO 4 – Persistência e Monitoramento

- US12 – Registrar todas as interações realizadas
- US13 – Armazenar fluxos percorridos
- US14 – Implementar relatório de fluxos mais utilizados
- US15 – Permitir exportação de dados para análise

## 🟦 ÉPICO 5 – LGPD e Conformidade

- US16 – Exibir aviso de caráter orientativo no início da conversa
- US17 – Implementar anonimização de dados (hash de telefone)
- US18 – Implementar exclusão de registros mediante solicitação
- US19 – Garantir armazenamento mínimo de dados pessoais

## 🟦 ÉPICO 6 – Usabilidade e Qualidade

- US20 – Garantir linguagem clara e acessível
- US21 – Garantir tempo de resposta adequado (até 3 segundos)
- US22 – Implementar testes de fluxo completo
- US23 – Implementar tratamento de erros e fallback seguro

# 📌 Requisitos Funcionais

**RF01:** Permitir interação do usuário via WhatsApp utilizando chatbot como interface principal.  
**RF02:** Apresentar opções de resposta com base em tabela de decisões do PROCON.  
**RF03:** Permitir navegação sequencial por fluxos decisórios.  
**RF04:** Gerar resposta orientadora ao final do fluxo.  
**RF05:** Permitir complemento textual por LLM, respeitando limites definidos pelo PROCON.  
**RF06:** Registrar interações para análise posterior.

# 📌 Requisitos Não Funcionais

**RNF01:** Linguagem clara, objetiva e acessível.  
**RNF02:** Alta disponibilidade e tempo de resposta adequado.  
**RNF03:** Conformidade com LGPD.  
**RNF04:** Transparência sobre caráter orientativo das respostas.  
**RNF05:** Identificação clara de conteúdo gerado com apoio de LLM.

# 🔐 Restrições do Projeto

**RP01:** Integração preferencial com WhatsApp Business Cloud API (ou simulador acadêmico).  
**RP02:** Backend em Node.js ou Python.  
**RP03:** Estrutura modular separando fluxo, chatbot e LLM.  
**RP04:** Escopo compatível com o tempo de desenvolvimento do semestre.

# 🚀 Objetivo Final

Entregar um sistema funcional, modular e seguro, que:

- Oriente consumidores com base em fluxos oficiais do PROCON
- Utilize LLM de forma controlada e transparente
- Respeite princípios de usabilidade e proteção de dados
- Permita análise posterior das interações

## 📅 Planejamento

O desenvolvimento será organizado em 3 sprints:

- **Sprint 1:** Estrutura básica + motor de fluxo
- **Sprint 2:** Persistência + conformidade LGPD
- **Sprint 3:** Integração LLM + refinamentos finais

📎 Projeto acadêmico – Desenvolvimento de Software Multiplataforma  
Instituição: Fatec Jacareí
Semestre: 6º semestre - 2026
