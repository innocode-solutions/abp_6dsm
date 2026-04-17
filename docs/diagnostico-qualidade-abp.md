# Diagnóstico de Qualidade do Projeto ABP

## 1. Descrição do processo atual

O projeto **ProconBot Jacareí** apresenta um processo de desenvolvimento parcialmente estruturado, com sinais claros de organização, mas ainda sem maturidade alta. Há evidências de planejamento no `README.md`, que contém **product backlog**, **sprints**, papéis da equipe e visão do produto. Também existe divisão de responsabilidades em nível de equipe, com identificação de **Product Owner**, **Scrum Master** e **Dev Team**.

O repositório utiliza **Git** de forma efetiva, com histórico de **52 commits** no branch atual e presença de merges de pull requests, como `#57`, `#55`, `#54`, `#52`, `#49`, `#47`, `#46` e `#45`. Isso sugere uso real de fluxo colaborativo e algum nível de revisão antes da integração. Também há pipeline em `.github/workflows/ci.yml`, executando `typecheck`, testes e build em `push` e `pull_request`, o que reforça disciplina mínima no processo.

Por outro lado, o projeto ainda não demonstra um processo totalmente padronizado. Não foram encontradas evidências de **lint automatizado**, **formatter configurado**, **template de code review**, **registro estruturado de defeitos**, **métricas automatizadas de qualidade** ou documentação clara de cerimônias e critérios de aceite. Além disso, o `README.md` descreve elementos como **RAG**, **LLM**, **cloud** e parte da arquitetura futura como se já fossem realidade operacional, enquanto o código atual permanece majoritariamente determinístico e centrado em fluxos. Essa divergência entre documentação e implementação reduz a confiabilidade do processo.

### Respostas da Parte 1

| Pergunta | Avaliação | Justificativa |
|---|---|---|
| Existe planejamento definido? | Sim, parcialmente | O `README.md` contém backlog, sprints e prioridades. Não há evidência de cronograma detalhado nem acompanhamento formal de execução. |
| Há divisão clara de tarefas? | Parcialmente | Existem papéis de equipe descritos, mas não há quadro de tarefas, issues atribuídas ou rastreabilidade por integrante dentro do repositório. |
| Existe controle de versão (Git)? | Sim | O projeto possui histórico consistente de commits, branches e merges de PR. |
| Há padronização de código? | Parcial | A estrutura em camadas é consistente e o TypeScript está em modo `strict`, mas faltam lint/formatter automatizados. |
| Existe documentação mínima? | Sim | Há `README.md`, `docs/`, `RELEASE.md`, `.env.example` e documentação de fluxos. |
| O desenvolvimento segue algum modelo? | Sim, com perfil Ágil/Scrum | O repositório cita backlog, sprints, Product Owner e Scrum Master. |
| Existe revisão de código (code review)? | Sim, indiretamente | A presença de merges de pull requests indica revisão ou pelo menos integração por branches. |
| Há comunicação eficiente entre os membros? | Parcialmente evidenciada | A organização por papéis e PRs sugere colaboração, mas não há registros de decisões, atas ou discussões no repositório. |

### Maturidade de processo

O grupo parece situado **entre o CMMI Nível 2 e o início do Nível 3**.

- Aproximação com **Nível 2 (Managed)**:
  - há versionamento;
  - existe backlog e sprints;
  - há pipeline de CI;
  - os builds e testes são executáveis e repetíveis.
- Distância do **Nível 3 (Defined)**:
  - falta padronização automatizada de código;
  - faltam critérios formais de revisão;
  - não há gestão explícita de defeitos e métricas;
  - a documentação funcional não está totalmente alinhada com o produto real.

## 2. Avaliação da qualidade do produto (ISO/IEC 25010)

| Característica | Nota (1-5) | Justificativa técnica |
|---|---:|---|
| Funcionalidade | 4 | O produto entrega bem o escopo implementado: integração com WhatsApp, motor de fluxos, menu, sessões e persistência opcional de histórico. Entretanto, o material descritivo promete mais do que o runtime atual entrega. |
| Desempenho | 3 | Para o porte atual, o processamento é leve e determinístico. Não há medições de tempo de resposta, testes de carga ou profiling. |
| Usabilidade | 3 | O menu é simples, em português e com navegação por texto e número. Porém, não há testes com usuários nem avaliação formal de clareza, acessibilidade ou linguagem. |
| Confiabilidade | 4 | O projeto passou em `typecheck`, `build` e `54 testes` automatizados. A arquitetura separa responsabilidades e há fallback para fluxos. Como ponto fraco, sessões continuam em memória e dependem do processo ativo. |
| Segurança | 2 | Há uso de variáveis de ambiente e mascaramento parcial de número no log, mas não foram encontradas políticas de autenticação, autorização, criptografia, sanitização robusta, auditoria formal ou testes de segurança. |
| Manutenibilidade | 4 | O código está modularizado por camadas (`bot`, `messages`, `flows`, `engine`, `sessions`, `database`, `whatsapp`) e usa interfaces. Perde pontos pela ausência de lint/formatter e pela divergência entre documentação e implementação. |
| Portabilidade | 4 | O projeto compila em TypeScript, roda em Node.js, possui `Dockerfile` e workflow CI em Linux. Há dependências específicas do WhatsApp Web, mas a base é razoavelmente portátil. |

### Relação com McCall e Boehm

- **McCall**:
  - **Correctness**: boa aderência ao escopo implementado, mas com descompasso entre README e produto real.
  - **Reliability**: reforçada por testes unitários e checagens automatizadas.
  - **Maintainability/Flexibility**: favorecida pela separação em camadas e uso de interfaces.
  - **Integrity**: ainda fraca, pois segurança não está madura.
  - **Usability**: funcional, porém sem validação empírica com usuários finais.

- **Boehm**:
  - **As-is utility**: o sistema já resolve um problema real com fluxos orientativos.
  - **Maintainability**: boa estrutura interna para evolução incremental.
  - **Portability**: razoável por usar Node.js, TypeScript e contêiner.
  - **Human engineering**: ainda depende de validação prática com consumidores para confirmar clareza e efetividade.

## 3. Verificação e Validação (V&V)

### Verificação

A pergunta "o sistema está sendo construído corretamente?" pode ser respondida, em boa parte, com **sim**.

Evidências:

- TypeScript com `strict: true`;
- pipeline CI com `typecheck`, `test:run` e `build`;
- **12 arquivos de teste** e **54 testes aprovados**;
- organização em interfaces e camadas, reduzindo acoplamento;
- uso de PRs e merges, sugerindo verificação por integração.

Limitações da verificação:

- não há lint estático;
- não há análise automatizada de cobertura;
- não há checklist formal de revisão;
- não há rastreabilidade explícita entre requisito e teste.

### Validação

A pergunta "o sistema atende às necessidades do usuário?" só pode ser respondida com **parcialmente**.

Pontos positivos:

- o chatbot atende o caso de uso central já implementado: orientação inicial via WhatsApp;
- os fluxos estão em português e focados em cenários reais do PROCON;
- o comportamento principal é coerente com a proposta de atendimento inicial.

Limitações:

- não foram encontradas evidências de **testes de aceitação com usuários**;
- não há registro de **feedback de usuários finais**;
- não existe critério de aceite documentado por história;
- a documentação de visão de produto inclui funcionalidades ainda não operacionalizadas, o que dificulta validar aderência do produto à expectativa criada.

Conclusão de V&V: a **verificação** está em nível melhor que a **validação**.

## 4. Avaliação do processo de testes

### Respostas da Parte 4

| Item | Avaliação | Justificativa |
|---|---|---|
| Existem testes unitários? | Sim | Há testes para engine, message processor, bot, provider, flows, bootstrap e repositório. |
| Existem testes manuais? | Parcialmente implícito | O uso de WhatsApp Web e QR/pairing sugere validação manual operacional, mas isso não está documentado como plano de testes. |
| Há testes de integração? | Limitados | Existem testes de bootstrap e interação entre classes, porém a maior parte usa mocks; não há integração real com WhatsApp ou Mongo em ambiente automatizado. |
| Existe planejamento de testes? | Não evidenciado formalmente | Há suíte de testes, mas não foi encontrado documento com estratégia, critérios, massa de dados e responsabilidades. |
| Há registro de defeitos (bugs)? | Não evidenciado | O repositório mostra histórico de correções em commits, mas não um sistema explícito de bugs com severidade, causa e tempo de resolução. |

### Classificação dos testes utilizados

- **Funcionais (caixa preta)**:
  - testes de fluxos e respostas esperadas;
  - seleção por menu;
  - retorno ao menu;
  - comportamento do bootstrap.
- **Estruturais (caixa branca)**:
  - testes do `FlowEngine`;
  - testes do `MessageProcessorService`;
  - testes do `MongoHistoryRepository` com mocks;
  - testes do `WhatsAppProvider` cobrindo decisões internas.
- **Baseados em defeitos**:
  - cenários de opção inválida;
  - comportamento com QR repetido;
  - ignorar mensagens do próprio bot, grupos e `status@broadcast`;
  - fallback quando fluxo não é encontrado.

### Leitura crítica

O processo de testes é **bom para o estágio atual do projeto**, mas ainda não é completo. A maior lacuna é a ausência de:

- cobertura formal;
- testes de integração ponta a ponta;
- testes de aceitação;
- registro e análise histórica de defeitos.

## 5. Identificação de riscos

| Risco | Classificação | Justificativa |
|---|---|---|
| Falta de padrão de desenvolvimento | Médio | A arquitetura é organizada, mas não há lint/formatter/regras automatizadas. |
| Ausência de testes | Baixo | O projeto possui boa base de testes unitários. |
| Falta de documentação | Médio | Existe documentação mínima, porém parte dela está desalinhada com a implementação atual. |
| Dependência de um único integrante | Médio | Há vários contribuidores, mas o histórico é concentrado em poucos nomes e isso pode gerar gargalo de conhecimento. |
| Código desorganizado | Baixo | O código está bem segmentado por módulos e responsabilidades. |
| Falta de controle de versão | Baixo | O uso de Git e PRs é evidente. |
| Retrabalho frequente | Médio | O histórico mostra correções, reversões e merges de resolução, sugerindo algum retrabalho técnico. |

### Riscos adicionais observados

| Risco adicional | Classificação | Justificativa |
|---|---|---|
| Divergência entre documentação e produto real | Alto | O README cria expectativa de RAG/LLM/cloud/plataforma mais ampla do que o código entrega hoje. |
| Persistência parcial de sessão | Médio | O histórico pode ir para Mongo, mas as sessões ativas permanecem em memória. |
| Segurança operacional insuficiente | Alto | Não há evidência de testes de segurança, gestão de segredos avançada, autorização ou hardening formal. |

## 6. QA x QC no projeto

### QA - Garantia da Qualidade (prevenção)

Práticas de QA identificadas:

- definição de backlog e sprints;
- estrutura modular do código;
- uso de Git e branches;
- workflow de CI;
- TypeScript com tipagem estrita;
- `.env.example` e documentação básica de operação.

Pontos fracos de QA:

- ausência de padronização automatizada de estilo;
- ausência de critérios formais de aceite;
- ausência de política explícita de revisão;
- documentação de produto desatualizada em relação ao runtime.

### QC - Controle da Qualidade (detecção)

Práticas de QC identificadas:

- testes unitários;
- execução de build e typecheck;
- uso de mocks para verificar integrações locais;
- commits de correção e estabilização;
- validações de comportamento no provider do WhatsApp.

Pontos fracos de QC:

- não há relatório de cobertura;
- não há testes automatizados ponta a ponta;
- não há base estruturada de defeitos;
- não há testes de segurança ou desempenho.

## 7. Métricas de qualidade

### Métricas observáveis no estado atual

| Métrica | Valor atual observável | Observação |
|---|---:|---|
| Número de bugs encontrados na verificação executada | 0 falhas de teste | No momento da análise, `54/54` testes passaram. |
| Tempo de correção | Não mensurável com precisão | Não existe registro formal de defeitos com timestamp de abertura e fechamento. |
| Quantidade de commits | 52 | Valor medido no branch atual analisado. |
| Cobertura de testes | Não disponível | O projeto não publica relatório automatizado de cobertura. |
| Número de funcionalidades concluídas | 5 fluxos principais + orquestração + persistência opcional de histórico | Valor inferido do código implementado, não de ferramenta de gestão. |

### Métricas recomendadas para acompanhar

- taxa de aprovação da suíte por sprint;
- cobertura de testes por módulo;
- número de defeitos por severidade;
- tempo médio de correção;
- taxa de retrabalho por funcionalidade;
- percentual de histórias com critério de aceite e teste associado.

## 8. Plano de melhoria

### Ação 1

- **O que será feito:** alinhar a documentação com o produto realmente implementado.
- **Como será feito:** revisar `README.md`, separar claramente "estado atual" de "roadmap" e vincular cada funcionalidade às histórias concluídas.
- **Quem será responsável:** Product Owner com apoio do Scrum Master e revisão do time de desenvolvimento.

### Ação 2

- **O que será feito:** padronizar qualidade de código e revisão técnica.
- **Como será feito:** adicionar ESLint e Prettier, definir convenções mínimas, checklist de PR e exigir passagem do CI antes de merge.
- **Quem será responsável:** Scrum Master e um desenvolvedor de referência técnica do grupo.

### Ação 3

- **O que será feito:** fortalecer V&V e o processo de testes.
- **Como será feito:** criar critérios de aceite por história, registrar bugs em issues, habilitar cobertura no Vitest e incluir pelo menos um teste de integração ponta a ponta por fluxo crítico.
- **Quem será responsável:** equipe de desenvolvimento, com acompanhamento do responsável por qualidade do grupo.

## 9. Conclusão

O projeto demonstra **boa qualidade técnica para um produto acadêmico em evolução**, principalmente pela organização modular, uso de Git, CI, TypeScript estrito e bateria consistente de testes automatizados. Isso indica uma base saudável para crescimento.

Ao mesmo tempo, a análise mostra lacunas típicas de maturidade intermediária: padronização insuficiente, validação ainda fraca com usuários, pouca instrumentação de métricas, ausência de gestão formal de defeitos e documentação mais ambiciosa do que a implementação atual. Em termos de qualidade de software, o projeto está **mais forte em verificação e estrutura interna do que em validação, segurança e governança do processo**.

Em síntese, o grupo demonstra um processo compatível com **maturidade intermediária**, com fundamentos sólidos e espaço claro para evoluir rumo a um processo mais definido, mensurável e previsível.
