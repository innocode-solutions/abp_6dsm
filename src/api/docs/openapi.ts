type OpenApiDocument = Record<string, unknown>;

const metaSchema = {
  type: "object",
  properties: {
    requisicao_id: { type: "string", example: "req-abc123" },
    timestamp: { type: "string", format: "date-time" },
  },
};

const errorResponse = {
  type: "object",
  properties: {
    erro: {
      type: "object",
      properties: {
        codigo: { type: "string", example: "NAO_AUTENTICADO" },
        mensagem: { type: "string", example: "NAO_AUTENTICADO" },
      },
    },
    meta: metaSchema,
  },
};

function successEnvelope(schema: Record<string, unknown>): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      dados: schema,
      meta: metaSchema,
    },
  };
}

function jsonResponse(status: string, description: string, schema: Record<string, unknown>) {
  return {
    [status]: {
      description,
      content: {
        "application/json": {
          schema,
        },
      },
    },
  };
}

function errorResponses(...statuses: Array<"400" | "401" | "403" | "404" | "409" | "429" | "500">) {
  return Object.fromEntries(
    statuses.map((status) => [
      status,
      {
        description: "Erro",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    ]),
  );
}

function bearerSecurity() {
  return [{ bearerAuth: [] }];
}

function apiKeySecurity() {
  return [{ apiKeyAuth: [] }];
}

function idParameter(name = "id", description = "ID do recurso") {
  return {
    name,
    in: "path",
    required: true,
    description,
    schema: { type: "string", example: "507f1f77bcf86cd799439011" },
  };
}

function codigoParameter() {
  return {
    name: "codigo",
    in: "path",
    required: true,
    description: "Codigo do agendamento",
    schema: { type: "string", example: "AGD-2026-000001" },
  };
}

function crudPaths(
  basePath: string,
  tag: string,
  schemaName: string,
  createSchemaName: string,
  updateSchemaName: string,
) {
  return {
    [basePath]: {
      get: {
        tags: [tag],
        summary: `Listar ${tag.toLowerCase()}`,
        security: bearerSecurity(),
        parameters: [
          {
            name: "ativo",
            in: "query",
            required: false,
            description: "Use false para inativos ou all para todos",
            schema: { type: "string", enum: ["true", "false", "all"] },
          },
        ],
        responses: {
          ...jsonResponse(
            "200",
            "Lista retornada",
            successEnvelope({
              type: "array",
              items: { $ref: `#/components/schemas/${schemaName}` },
            }),
          ),
          ...errorResponses("401", "403", "429", "500"),
        },
      },
      post: {
        tags: [tag],
        summary: `Criar ${tag.toLowerCase()}`,
        security: bearerSecurity(),
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: `#/components/schemas/${createSchemaName}` },
            },
          },
        },
        responses: {
          ...jsonResponse(
            "201",
            "Recurso criado",
            successEnvelope({ $ref: `#/components/schemas/${schemaName}` }),
          ),
          ...errorResponses("400", "401", "403", "429", "500"),
        },
      },
    },
    [`${basePath}/{id}`]: {
      get: {
        tags: [tag],
        summary: `Buscar ${tag.toLowerCase()} por ID`,
        security: bearerSecurity(),
        parameters: [idParameter()],
        responses: {
          ...jsonResponse(
            "200",
            "Recurso retornado",
            successEnvelope({ $ref: `#/components/schemas/${schemaName}` }),
          ),
          ...errorResponses("401", "403", "404", "429", "500"),
        },
      },
      patch: {
        tags: [tag],
        summary: `Atualizar ${tag.toLowerCase()}`,
        security: bearerSecurity(),
        parameters: [idParameter()],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: `#/components/schemas/${updateSchemaName}` },
            },
          },
        },
        responses: {
          ...jsonResponse(
            "200",
            "Recurso atualizado",
            successEnvelope({ $ref: `#/components/schemas/${schemaName}` }),
          ),
          ...errorResponses("400", "401", "403", "404", "429", "500"),
        },
      },
      delete: {
        tags: [tag],
        summary: `Remover ${tag.toLowerCase()} com soft delete`,
        security: bearerSecurity(),
        parameters: [idParameter()],
        responses: {
          ...jsonResponse(
            "200",
            "Recurso removido",
            successEnvelope({ $ref: `#/components/schemas/${schemaName}` }),
          ),
          ...errorResponses("401", "403", "404", "429", "500"),
        },
      },
    },
  };
}

export const openApiDocument: OpenApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "API de Agendamento Procon Jacarei",
    version: "1.0.0",
    description:
      "Documentacao para testar login, rotas do chatbot, rotas administrativas e CRUDs de configuracao.",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Ambiente local",
    },
  ],
  tags: [
    { name: "Auth", description: "Login do portal administrativo" },
    { name: "Chatbot", description: "Rotas consumidas pelo chatbot via x-api-key" },
    { name: "Admin", description: "Rotas do portal administrativo via JWT" },
    { name: "Servicos", description: "CRUD de servicos" },
    { name: "Funcionarios", description: "CRUD de funcionarios" },
    { name: "Regras de disponibilidade", description: "CRUD de regras de disponibilidade" },
    { name: "Feriados", description: "CRUD de feriados" },
  ],
  paths: {
    "/api/v1/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login do portal administrativo",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          ...jsonResponse(
            "200",
            "Login realizado",
            successEnvelope({ $ref: "#/components/schemas/LoginResponse" }),
          ),
          ...errorResponses("400", "401", "500"),
        },
      },
    },

    "/api/v1/agendamentos/servicos": {
      get: {
        tags: ["Chatbot"],
        summary: "Listar servicos ativos para o chatbot",
        security: apiKeySecurity(),
        responses: {
          ...jsonResponse(
            "200",
            "Servicos retornados",
            successEnvelope({
              type: "array",
              items: { $ref: "#/components/schemas/Servico" },
            }),
          ),
          ...errorResponses("401", "429", "500"),
        },
      },
    },
    "/api/v1/agendamentos/horarios-disponiveis": {
      get: {
        tags: ["Chatbot"],
        summary: "Listar horarios disponiveis",
        security: apiKeySecurity(),
        parameters: [
          {
            name: "servico_id",
            in: "query",
            required: true,
            schema: { type: "string", example: "507f1f77bcf86cd799439011" },
          },
          {
            name: "de",
            in: "query",
            required: false,
            schema: { type: "string", format: "date", example: "2026-06-01" },
          },
          {
            name: "ate",
            in: "query",
            required: false,
            schema: { type: "string", format: "date", example: "2026-06-07" },
          },
          {
            name: "limite",
            in: "query",
            required: false,
            schema: { type: "integer", example: 5 },
          },
        ],
        responses: {
          ...jsonResponse(
            "200",
            "Horarios retornados",
            successEnvelope({
              type: "array",
              items: { $ref: "#/components/schemas/HorarioExibicao" },
            }),
          ),
          ...errorResponses("401", "429", "500"),
        },
      },
    },
    "/api/v1/agendamentos/pre-reservas": {
      post: {
        tags: ["Chatbot"],
        summary: "Criar pre-reserva de horario",
        security: apiKeySecurity(),
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PreReservaRequest" },
            },
          },
        },
        responses: {
          ...jsonResponse(
            "200",
            "Pre-reserva criada",
            successEnvelope({ $ref: "#/components/schemas/PreReservaResponse" }),
          ),
          ...errorResponses("401", "409", "429", "500"),
        },
      },
    },
    "/api/v1/agendamentos/agendamentos": {
      post: {
        tags: ["Chatbot"],
        summary: "Confirmar agendamento",
        security: apiKeySecurity(),
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ConfirmarAgendamentoRequest" },
            },
          },
        },
        responses: {
          ...jsonResponse(
            "201",
            "Agendamento criado",
            successEnvelope({ $ref: "#/components/schemas/CodigoAgendamentoResponse" }),
          ),
          ...errorResponses("401", "409", "429", "500"),
        },
      },
    },
    "/api/v1/agendamentos/{codigo}": {
      get: {
        tags: ["Chatbot"],
        summary: "Consultar agendamento por codigo",
        security: apiKeySecurity(),
        parameters: [codigoParameter()],
        responses: {
          ...jsonResponse(
            "200",
            "Agendamento retornado",
            successEnvelope({ $ref: "#/components/schemas/Agendamento" }),
          ),
          ...errorResponses("401", "404", "429", "500"),
        },
      },
    },
    "/api/v1/agendamentos/{codigo}/cancelar": {
      post: {
        tags: ["Chatbot"],
        summary: "Cancelar agendamento pelo chatbot",
        security: apiKeySecurity(),
        parameters: [codigoParameter()],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CancelarAgendamentoRequest" },
            },
          },
        },
        responses: {
          ...jsonResponse(
            "200",
            "Agendamento cancelado",
            successEnvelope({ $ref: "#/components/schemas/Agendamento" }),
          ),
          ...errorResponses("401", "404", "409", "429", "500"),
        },
      },
    },
    "/api/v1/agendamentos/{codigo}/remarcar": {
      post: {
        tags: ["Chatbot"],
        summary: "Remarcar agendamento pelo chatbot",
        security: apiKeySecurity(),
        parameters: [codigoParameter()],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RemarcarAgendamentoRequest" },
            },
          },
        },
        responses: {
          ...jsonResponse(
            "200",
            "Agendamento remarcado",
            successEnvelope({ $ref: "#/components/schemas/CodigoAgendamentoResponse" }),
          ),
          ...errorResponses("401", "404", "409", "429", "500"),
        },
      },
    },

    "/api/v1/agendamentos/admin/agenda": {
      get: {
        tags: ["Admin"],
        summary: "Listar agenda administrativa",
        security: bearerSecurity(),
        parameters: [
          {
            name: "data",
            in: "query",
            required: false,
            schema: { type: "string", format: "date", example: "2026-06-01" },
          },
          {
            name: "status",
            in: "query",
            required: false,
            schema: { type: "string", example: "confirmado" },
          },
          {
            name: "funcionario_id",
            in: "query",
            required: false,
            schema: { type: "string", example: "507f1f77bcf86cd799439011" },
          },
        ],
        responses: {
          ...jsonResponse(
            "200",
            "Agenda retornada",
            successEnvelope({
              type: "array",
              items: { $ref: "#/components/schemas/Agendamento" },
            }),
          ),
          ...errorResponses("401", "403", "429", "500"),
        },
      },
    },
    "/api/v1/agendamentos/admin/horarios": {
      get: {
        tags: ["Admin"],
        summary: "Listar horarios administrativamente",
        security: bearerSecurity(),
        parameters: [
          { name: "funcionario_id", in: "query", required: false, schema: { type: "string" } },
          { name: "servico_id", in: "query", required: false, schema: { type: "string" } },
          { name: "status", in: "query", required: false, schema: { type: "string" } },
          { name: "de", in: "query", required: false, schema: { type: "string", format: "date" } },
          { name: "ate", in: "query", required: false, schema: { type: "string", format: "date" } },
        ],
        responses: {
          ...jsonResponse(
            "200",
            "Horarios retornados",
            successEnvelope({
              type: "array",
              items: { $ref: "#/components/schemas/Horario" },
            }),
          ),
          ...errorResponses("401", "403", "429", "500"),
        },
      },
    },
    "/api/v1/agendamentos/admin/horarios/gerar": {
      post: {
        tags: ["Admin"],
        summary: "Gerar horarios a partir das regras de disponibilidade",
        security: bearerSecurity(),
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GerarHorariosRequest" },
            },
          },
        },
        responses: {
          ...jsonResponse(
            "201",
            "Horarios gerados",
            successEnvelope({ $ref: "#/components/schemas/GerarHorariosResponse" }),
          ),
          ...errorResponses("400", "401", "403", "429", "500"),
        },
      },
    },
    "/api/v1/agendamentos/admin/bloqueios": {
      post: {
        tags: ["Admin"],
        summary: "Criar bloqueio de agenda",
        security: bearerSecurity(),
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CriarBloqueioRequest" },
            },
          },
        },
        responses: {
          ...jsonResponse(
            "201",
            "Bloqueio criado",
            successEnvelope({ $ref: "#/components/schemas/CriarBloqueioResponse" }),
          ),
          ...errorResponses("400", "401", "403", "429", "500"),
        },
      },
    },
    "/api/v1/agendamentos/admin/bloqueios/{id}": {
      delete: {
        tags: ["Admin"],
        summary: "Remover bloqueio de agenda",
        security: bearerSecurity(),
        parameters: [idParameter()],
        responses: {
          ...jsonResponse(
            "200",
            "Bloqueio removido",
            successEnvelope({ $ref: "#/components/schemas/RemoverBloqueioResponse" }),
          ),
          ...errorResponses("401", "403", "404", "429", "500"),
        },
      },
    },
    "/api/v1/agendamentos/admin/{codigo}/check-in": {
      post: {
        tags: ["Admin"],
        summary: "Realizar check-in do cidadao",
        security: bearerSecurity(),
        parameters: [codigoParameter()],
        responses: {
          ...jsonResponse(
            "200",
            "Check-in realizado",
            successEnvelope({ $ref: "#/components/schemas/StatusAgendamentoResponse" }),
          ),
          ...errorResponses("401", "403", "404", "409", "429", "500"),
        },
      },
    },
    "/api/v1/agendamentos/admin/{codigo}/nao-compareceu": {
      post: {
        tags: ["Admin"],
        summary: "Marcar nao comparecimento",
        security: bearerSecurity(),
        parameters: [codigoParameter()],
        responses: {
          ...jsonResponse(
            "200",
            "Nao comparecimento registrado",
            successEnvelope({ $ref: "#/components/schemas/StatusAgendamentoResponse" }),
          ),
          ...errorResponses("401", "403", "404", "409", "429", "500"),
        },
      },
    },
    "/api/v1/agendamentos/admin/{codigo}/concluir": {
      post: {
        tags: ["Admin"],
        summary: "Concluir atendimento",
        security: bearerSecurity(),
        parameters: [codigoParameter()],
        responses: {
          ...jsonResponse(
            "200",
            "Atendimento concluido",
            successEnvelope({ $ref: "#/components/schemas/StatusAgendamentoResponse" }),
          ),
          ...errorResponses("401", "403", "404", "409", "429", "500"),
        },
      },
    },

    ...crudPaths(
      "/api/v1/agendamentos/admin/servicos",
      "Servicos",
      "Servico",
      "ServicoCreateRequest",
      "ServicoUpdateRequest",
    ),
    ...crudPaths(
      "/api/v1/agendamentos/admin/funcionarios",
      "Funcionarios",
      "Funcionario",
      "FuncionarioCreateRequest",
      "FuncionarioUpdateRequest",
    ),
    ...crudPaths(
      "/api/v1/agendamentos/admin/regras-disponibilidade",
      "Regras de disponibilidade",
      "RegraDisponibilidade",
      "RegraDisponibilidadeCreateRequest",
      "RegraDisponibilidadeUpdateRequest",
    ),
    ...crudPaths(
      "/api/v1/agendamentos/admin/feriados",
      "Feriados",
      "Feriado",
      "FeriadoCreateRequest",
      "FeriadoUpdateRequest",
    ),
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Token retornado por POST /api/v1/auth/login",
      },
      apiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "x-api-key",
        description: "Chave interna do chatbot",
      },
    },
    schemas: {
      ErrorResponse: errorResponse,
      LoginRequest: {
        type: "object",
        required: ["email", "senha"],
        properties: {
          email: { type: "string", format: "email", example: "admin@procon.test" },
          senha: { type: "string", example: "senha-forte" },
        },
      },
      LoginResponse: {
        type: "object",
        properties: {
          token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
          usuario: { $ref: "#/components/schemas/FuncionarioAutenticado" },
        },
      },
      FuncionarioAutenticado: {
        type: "object",
        properties: {
          id: { type: "string", example: "507f1f77bcf86cd799439011" },
          nome: { type: "string", example: "Administrador" },
          email: { type: "string", example: "admin@procon.test" },
          perfil: { type: "string", enum: ["admin", "atendente"] },
        },
      },
      Funcionario: {
        type: "object",
        properties: {
          _id: { type: "string", example: "507f1f77bcf86cd799439011" },
          nome: { type: "string", example: "Maria" },
          email: { type: "string", example: "maria@procon.test" },
          perfil: { type: "string", enum: ["admin", "atendente"] },
          ativo: { type: "boolean", example: true },
          criado_em: { type: "string", format: "date-time" },
          atualizado_em: { type: "string", format: "date-time" },
        },
      },
      FuncionarioCreateRequest: {
        type: "object",
        required: ["nome", "email", "perfil", "senha"],
        properties: {
          nome: { type: "string", example: "Maria" },
          email: { type: "string", example: "maria@procon.test" },
          perfil: { type: "string", enum: ["admin", "atendente"], example: "atendente" },
          senha: { type: "string", example: "senha-inicial" },
        },
      },
      FuncionarioUpdateRequest: {
        type: "object",
        properties: {
          nome: { type: "string", example: "Maria Silva" },
          email: { type: "string", example: "maria@procon.test" },
          perfil: { type: "string", enum: ["admin", "atendente"] },
          senha: { type: "string", example: "nova-senha" },
          ativo: { type: "boolean", example: true },
        },
      },
      Servico: {
        type: "object",
        properties: {
          _id: { type: "string", example: "507f1f77bcf86cd799439011" },
          nome: { type: "string", example: "Atendimento presencial" },
          descricao: { type: "string", example: "Orientacao presencial no Procon" },
          duracao_minutos: { type: "integer", example: 30 },
          documentos_necessarios: {
            type: "array",
            items: { type: "string" },
            example: ["Documento com foto", "CPF", "Comprovantes"],
          },
          ativo: { type: "boolean", example: true },
        },
      },
      ServicoCreateRequest: {
        type: "object",
        required: ["nome", "descricao", "duracao_minutos"],
        properties: {
          nome: { type: "string", example: "Atendimento presencial" },
          descricao: { type: "string", example: "Orientacao presencial no Procon" },
          duracao_minutos: { type: "integer", example: 30 },
          documentos_necessarios: {
            type: "array",
            items: { type: "string" },
            example: ["Documento com foto", "CPF"],
          },
        },
      },
      ServicoUpdateRequest: {
        type: "object",
        properties: {
          nome: { type: "string" },
          descricao: { type: "string" },
          duracao_minutos: { type: "integer" },
          documentos_necessarios: { type: "array", items: { type: "string" } },
          ativo: { type: "boolean" },
        },
      },
      RegraDisponibilidade: {
        type: "object",
        properties: {
          _id: { type: "string" },
          funcionario_id: { type: "string", example: "507f1f77bcf86cd799439011" },
          servico_id: { type: "string", example: "507f1f77bcf86cd799439012" },
          dia_semana: { type: "integer", minimum: 0, maximum: 6, example: 1 },
          hora_inicio: { type: "string", example: "09:00" },
          hora_fim: { type: "string", example: "17:00" },
          duracao_horario_minutos: { type: "integer", example: 30 },
          ativo: { type: "boolean", example: true },
        },
      },
      RegraDisponibilidadeCreateRequest: {
        type: "object",
        required: [
          "funcionario_id",
          "servico_id",
          "dia_semana",
          "hora_inicio",
          "hora_fim",
          "duracao_horario_minutos",
        ],
        properties: {
          funcionario_id: { type: "string", example: "507f1f77bcf86cd799439011" },
          servico_id: { type: "string", example: "507f1f77bcf86cd799439012" },
          dia_semana: { type: "integer", minimum: 0, maximum: 6, example: 1 },
          hora_inicio: { type: "string", example: "09:00" },
          hora_fim: { type: "string", example: "17:00" },
          duracao_horario_minutos: { type: "integer", example: 30 },
        },
      },
      RegraDisponibilidadeUpdateRequest: {
        type: "object",
        properties: {
          funcionario_id: { type: "string" },
          servico_id: { type: "string" },
          dia_semana: { type: "integer" },
          hora_inicio: { type: "string" },
          hora_fim: { type: "string" },
          duracao_horario_minutos: { type: "integer" },
          ativo: { type: "boolean" },
        },
      },
      Feriado: {
        type: "object",
        properties: {
          _id: { type: "string" },
          data: { type: "string", example: "2026-06-13" },
          nome: { type: "string", example: "Feriado municipal" },
          tipo: { type: "string", enum: ["nacional", "estadual", "municipal"] },
          bloqueia_agendamento: { type: "boolean", example: true },
          ativo: { type: "boolean", example: true },
        },
      },
      FeriadoCreateRequest: {
        type: "object",
        required: ["data", "nome", "tipo"],
        properties: {
          data: { type: "string", example: "2026-06-13" },
          nome: { type: "string", example: "Feriado municipal" },
          tipo: { type: "string", enum: ["nacional", "estadual", "municipal"] },
          bloqueia_agendamento: { type: "boolean", example: true },
        },
      },
      FeriadoUpdateRequest: {
        type: "object",
        properties: {
          data: { type: "string" },
          nome: { type: "string" },
          tipo: { type: "string", enum: ["nacional", "estadual", "municipal"] },
          bloqueia_agendamento: { type: "boolean" },
          ativo: { type: "boolean" },
        },
      },
      Horario: {
        type: "object",
        properties: {
          _id: { type: "string" },
          funcionario_id: { type: "string" },
          servico_id: { type: "string" },
          inicio_em: { type: "string", format: "date-time" },
          fim_em: { type: "string", format: "date-time" },
          status: {
            type: "string",
            enum: ["disponivel", "pre_reservado", "agendado", "bloqueado", "expirado"],
          },
        },
      },
      HorarioExibicao: {
        allOf: [
          { $ref: "#/components/schemas/Horario" },
          {
            type: "object",
            properties: {
              exibicao: {
                type: "object",
                properties: {
                  data: { type: "string", example: "20/05/2026" },
                  hora: { type: "string", example: "09:00" },
                  dia_semana: { type: "string", example: "quarta-feira" },
                },
              },
            },
          },
        ],
      },
      PreReservaRequest: {
        type: "object",
        required: ["horario_id", "conversa_id", "minutos_pre_reserva"],
        properties: {
          horario_id: { type: "string", example: "507f1f77bcf86cd799439011" },
          conversa_id: { type: "string", example: "whatsapp_abc123" },
          origem: { type: "string", example: "whatsapp" },
          minutos_pre_reserva: { type: "integer", example: 15 },
        },
      },
      PreReservaResponse: {
        type: "object",
        properties: {
          pre_reserva_id: { type: "string", example: "507f1f77bcf86cd799439013" },
          horario_id: { type: "string", example: "507f1f77bcf86cd799439011" },
        },
      },
      ConfirmarAgendamentoRequest: {
        type: "object",
        required: ["horario_id", "pre_reserva_id", "conversa_id", "cidadao", "assunto", "descricao"],
        properties: {
          horario_id: { type: "string" },
          pre_reserva_id: { type: "string" },
          conversa_id: { type: "string", example: "whatsapp_abc123" },
          cidadao: {
            type: "object",
            required: ["nome", "cpf"],
            properties: {
              nome: { type: "string", example: "Maria Silva" },
              cpf: { type: "string", example: "52998224725" },
            },
          },
          assunto: { type: "string", example: "Cobranca indevida" },
          descricao: { type: "string", example: "Consumidor relata cobranca desconhecida." },
        },
      },
      CancelarAgendamentoRequest: {
        type: "object",
        required: ["motivo", "conversa_id", "cancelado_por"],
        properties: {
          motivo: { type: "string", example: "Cidadao solicitou cancelamento" },
          conversa_id: { type: "string", example: "whatsapp_abc123" },
          cancelado_por: {
            type: "object",
            properties: {
              tipo: { type: "string", example: "sistema" },
              id: { type: "string", example: "whatsapp_abc123" },
            },
          },
        },
      },
      RemarcarAgendamentoRequest: {
        type: "object",
        required: ["novo_horario_id", "pre_reserva_id", "conversa_id", "motivo"],
        properties: {
          novo_horario_id: { type: "string" },
          pre_reserva_id: { type: "string" },
          conversa_id: { type: "string", example: "whatsapp_abc123" },
          motivo: { type: "string", example: "Conflito de agenda" },
        },
      },
      CodigoAgendamentoResponse: {
        type: "object",
        properties: {
          codigo_agendamento: { type: "string", example: "AGD-2026-000001" },
        },
      },
      StatusAgendamentoResponse: {
        type: "object",
        properties: {
          codigo_agendamento: { type: "string", example: "AGD-2026-000001" },
          status: { type: "string", example: "check_in_realizado" },
        },
      },
      Agendamento: {
        type: "object",
        properties: {
          _id: { type: "string" },
          codigo_agendamento: { type: "string", example: "AGD-2026-000001" },
          cidadao: {
            type: "object",
            properties: {
              nome: { type: "string", example: "Maria Silva" },
              cpf: { type: "string", example: "52998224725" },
            },
          },
          servico_id: { type: "string" },
          funcionario_id: { type: "string" },
          horario_id: { type: "string" },
          status: { type: "string", example: "confirmado" },
          inicio_em: { type: "string", format: "date-time" },
          fim_em: { type: "string", format: "date-time" },
          assunto: { type: "string" },
          descricao: { type: "string" },
          origem: { type: "string", example: "whatsapp" },
          conversa_id: { type: "string" },
        },
      },
      GerarHorariosRequest: {
        type: "object",
        required: ["de", "ate"],
        properties: {
          de: { type: "string", format: "date", example: "2026-06-01" },
          ate: { type: "string", format: "date", example: "2026-06-07" },
        },
      },
      GerarHorariosResponse: {
        type: "object",
        properties: {
          horarios_criados: { type: "integer", example: 14 },
          de: { type: "string", format: "date-time" },
          ate: { type: "string", format: "date-time" },
        },
      },
      CriarBloqueioRequest: {
        type: "object",
        required: ["funcionario_id", "inicio_em", "fim_em", "motivo"],
        properties: {
          funcionario_id: { type: "string", example: "507f1f77bcf86cd799439011" },
          inicio_em: { type: "string", format: "date-time", example: "2026-06-01T10:00:00.000Z" },
          fim_em: { type: "string", format: "date-time", example: "2026-06-01T12:00:00.000Z" },
          motivo: { type: "string", example: "Reuniao interna" },
        },
      },
      CriarBloqueioResponse: {
        type: "object",
        properties: {
          bloqueio_id: { type: "string" },
          horarios_afetados: { type: "integer", example: 2 },
        },
      },
      RemoverBloqueioResponse: {
        type: "object",
        properties: {
          bloqueio_id: { type: "string" },
          horarios_liberados: { type: "integer", example: 2 },
        },
      },
    },
  },
};
