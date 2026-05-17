# Autenticacao do Portal (para o front)

Esta API expoe um login para o portal administrativo. Antes do primeiro acesso, crie um usuario
administrador no MongoDB.

## Criar Primeiro Admin

```powershell
$env:MONGO_URI="mongodb://127.0.0.1:27017/proconbot_jacarei"
$env:ADMIN_EMAIL="admin@procon.test"
$env:ADMIN_SENHA="senha-forte"
$env:ADMIN_NOME="Administrador"
npm.cmd run api:seed-admin
```

Se o e-mail ja existir, o script nao altera o usuario por padrao. Para atualizar senha, perfil e status
ativo desse e-mail, rode com:

```powershell
$env:ADMIN_SEED_UPDATE="true"
npm.cmd run api:seed-admin
```

## Login

```http
POST /api/v1/auth/login
Content-Type: application/json
```

Request:

```json
{
  "email": "admin@procon.test",
  "senha": "senha-forte"
}
```

Response `200`:

```json
{
  "dados": {
    "token": "jwt...",
    "usuario": {
      "id": "507f1f77bcf86cd799439011",
      "nome": "Administrador",
      "email": "admin@procon.test",
      "perfil": "admin"
    }
  },
  "meta": {
    "requisicao_id": "...",
    "timestamp": "2026-05-17T12:00:00.000Z"
  }
}
```

Erros de credencial, usuario inativo ou usuario sem senha cadastrada retornam `401`:

```json
{
  "erro": {
    "codigo": "NAO_AUTENTICADO",
    "mensagem": "NAO_AUTENTICADO"
  },
  "meta": {
    "requisicao_id": "...",
    "timestamp": "2026-05-17T12:00:00.000Z"
  }
}
```

## Uso do Token

Apos o login, o portal deve enviar o token nas rotas administrativas:

```http
Authorization: Bearer <token>
```

Perfis disponiveis:

- `admin`: acessa agenda e gerencia configuracoes como funcionarios, servicos, regras, feriados, bloqueios e geracao de horarios.
- `atendente`: acessa agenda, lista horarios e opera atendimento, check-in, nao comparecimento e conclusao.
