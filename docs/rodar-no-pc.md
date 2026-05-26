# Rodar no PC

Este modelo roda o bot no Windows sem depender da Railway.

## 1. Preparar o `.env`

Use `.env.pc.example` como referencia e copie para `.env` apenas as variaveis que quiser testar.

Para o primeiro teste local sem banco, deixe `MONGODB_URI` e `GEMINI_API_KEY` sem valor ou comentadas.

## 2. Validar o projeto

```powershell
cd C:\Users\Samuel\Desktop\abp_6dsm
npm.cmd run typecheck
npm.cmd run test:run
```

## 3. Subir o bot em modo desenvolvimento

```powershell
npm.cmd run dev
```

Escaneie o QR Code no terminal pelo WhatsApp em:

```txt
Dispositivos conectados > Conectar dispositivo
```

Mantenha o terminal aberto enquanto o bot estiver em uso.

## 4. Subir o bot em modo producao local

```powershell
npm.cmd run build
npm.cmd start
```

## Observacoes

- Nao apague `.wwebjs_auth`, pois ela guarda a sessao do WhatsApp.
- Desative suspensao/hibernacao do Windows se quiser manter o bot online.
- Sem MongoDB, historico e sessoes de conversa nao ficam persistidos entre reinicios.
- Com MongoDB local ou Atlas gratuito, o bot ativa persistencia automaticamente quando `MONGODB_URI` estiver definida.
