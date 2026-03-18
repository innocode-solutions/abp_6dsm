# Fluxo — Cobrança Indevida / Serviço Não Contratado

## 🎯 Objetivo

Orientar consumidores que identificaram uma cobrança indevida, especialmente em casos de **serviço não contratado**, como seguros ou serviços incluídos em faturas de cartão de crédito sem autorização.

---

## 🧠 Contexto PROCON

De acordo com orientações do PROCON, em casos de cobrança por serviço não contratado, o consumidor pode:

- Solicitar o **cancelamento imediato da cobrança**
- Solicitar a **devolução em dobro dos valores cobrados indevidamente**
- Solicitar o **envio do contrato relacionado à cobrança**

⚠️ Os casos podem apresentar variações e, dependendo da situação, pode ser necessário atendimento presencial para análise detalhada.

---

## ❓ Perguntas do Fluxo

1. O consumidor reconhece ou contratou a cobrança?
2. Onde a cobrança apareceu?
3. O consumidor possui documentos ou comprovantes?

---

## ⚙️ Lógica de Decisão

### Caso 1 — Não reconhece a cobrança
➡️ Considerado **possível serviço não contratado**

**Orientações:**
- Cancelamento imediato da cobrança
- Devolução em dobro dos valores
- Solicitação do contrato

---

### Caso 2 — Reconhece a cobrança
➡️ Fluxo não se aplica diretamente

**Orientação:**
- Avaliar outro tipo de problema (cancelamento, cláusula, cobrança abusiva)

---

### Caso 3 — Não sabe informar
➡️ Necessário reunir mais informações

**Orientação:**
- Reunir documentos antes de prosseguir

---

## 📄 Documentos Sugeridos

- RG com CPF
- Faturas com a descrição da cobrança desde o início
- Comprovantes de pagamento
- Mensagens ou e-mails com a empresa
- CNPJ da matriz do fornecedor

---

## ⚠️ Observações Importantes

- Este fluxo fornece **orientação inicial**
- Não substitui atendimento formal do PROCON
- Pode ser necessário comparecimento presencial

---

## 🔗 Integração no Sistema

Este fluxo será utilizado pelo:

- Motor de fluxo decisório (`FlowEngine`)
- Identificação por triggers (ex: "cobrança indevida", "seguro no cartão")
- Execução via WhatsApp chatbot

---

## 💬 Exemplo de uso

**Usuário:**
> Estão cobrando um seguro no meu cartão que eu não contratei

**Fluxo identificado:** cobrança indevida

**Resultado esperado:**
- Perguntas sequenciais
- Orientação sobre contestação
- Lista de documentos necessários

---

## ✅ Resultado Esperado

O usuário deve receber:

- Uma orientação clara sobre seus direitos
- Próximos passos para resolver o problema
- Informações sobre documentos necessários