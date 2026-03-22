-- ============================================================
-- MENTORIA EXPERTS — Setup completo do banco de dados
-- Rodar no Supabase SQL Editor
-- ============================================================

-- ENUMS
CREATE TYPE "Plano" AS ENUM ('START', 'PRO', 'ELITE');
CREATE TYPE "StatusAluno" AS ENUM ('ATIVO', 'APROVADO', 'CHURN', 'INATIVO');
CREATE TYPE "FaseMentoria" AS ENUM ('ONBOARDING', 'PRE_EDITAL', 'POS_EDITAL', 'PROXIMO_VENCIMENTO');
CREATE TYPE "NivelAcesso" AS ENUM ('ADMIN', 'MEMBRO');
CREATE TYPE "UrgenciaTarefa" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA');
CREATE TYPE "StatusTarefa" AS ENUM ('A_FAZER', 'EM_ANDAMENTO', 'CONCLUIDA');
CREATE TYPE "TipoTarefa" AS ENUM ('ONBOARDING_ACESSO_ESTRATEGIA', 'ONBOARDING_LISTA_TRANSMISSAO', 'ONBOARDING_PLANO_ESTUDOS', 'ONBOARDING_REUNIAO', 'FOLLOWUP', 'MANUAL');
CREATE TYPE "MotivoChurn" AS ENUM ('RESCISAO_SOLICITADA', 'VENCIMENTO_SEM_RENOVACAO', 'OUTRO');

-- MEMBROS DA EQUIPE
CREATE TABLE "membros_equipe" (
  "id"           TEXT        NOT NULL,
  "nome"         TEXT        NOT NULL,
  "email"        TEXT        NOT NULL,
  "senha"        TEXT        NOT NULL,
  "cargo"        TEXT,
  "nivelAcesso"  "NivelAcesso" NOT NULL DEFAULT 'MEMBRO',
  "ativo"        BOOLEAN     NOT NULL DEFAULT true,
  "criadoEm"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "membros_equipe_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "membros_equipe_email_key" ON "membros_equipe"("email");

-- SESSÕES (NextAuth)
CREATE TABLE "sessoes" (
  "id"           TEXT        NOT NULL,
  "sessionToken" TEXT        NOT NULL,
  "membroId"     TEXT        NOT NULL,
  "expires"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sessoes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sessoes_sessionToken_key" ON "sessoes"("sessionToken");

-- ALUNOS
CREATE TABLE "alunos" (
  "id"                     TEXT          NOT NULL,
  "nome"                   TEXT          NOT NULL,
  "cpf"                    TEXT          NOT NULL,
  "email"                  TEXT,
  "whatsapp"               TEXT,
  "dataEntrada"            TIMESTAMP(3)  NOT NULL,
  "dataVencimento"         TIMESTAMP(3)  NOT NULL,
  "plano"                  "Plano"       NOT NULL,
  "statusAtual"            "StatusAluno" NOT NULL DEFAULT 'ATIVO',
  "faseAtual"              "FaseMentoria" NOT NULL DEFAULT 'ONBOARDING',
  "faseManualOverride"     BOOLEAN       NOT NULL DEFAULT false,
  "cursoPrincipal"         TEXT,
  "plataformaQuestoes"     TEXT,
  "areaEstudo"             TEXT,
  "dataProva"              TIMESTAMP(3),
  "linkTutory"             TEXT,
  "dataUltimaAnalisePlano" TIMESTAMP(3),
  "dataUltimoFollowUp"     TIMESTAMP(3),
  "incluiAcessoEstrategia" BOOLEAN       NOT NULL DEFAULT false,
  "onboardingRespostas"    JSONB,
  "criadoEm"               TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm"           TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "alunos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "alunos_cpf_key" ON "alunos"("cpf");

-- MUDANÇAS DE FASE
CREATE TABLE "mudancas_fase" (
  "id"          TEXT           NOT NULL,
  "alunoId"     TEXT           NOT NULL,
  "fasAnterior" "FaseMentoria",
  "faseNova"    "FaseMentoria" NOT NULL,
  "motivo"      TEXT,
  "automatica"  BOOLEAN        NOT NULL DEFAULT true,
  "autorId"     TEXT,
  "criadoEm"    TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mudancas_fase_pkey" PRIMARY KEY ("id")
);

-- FOLLOW-UPS
CREATE TABLE "follow_ups" (
  "id"            TEXT         NOT NULL,
  "alunoId"       TEXT         NOT NULL,
  "responsavelId" TEXT         NOT NULL,
  "observacao"    TEXT,
  "realizadoEm"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "criadoEm"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "follow_ups_pkey" PRIMARY KEY ("id")
);

-- ANÁLISES DO PLANO DE ESTUDOS
CREATE TABLE "analises_plano" (
  "id"            TEXT         NOT NULL,
  "alunoId"       TEXT         NOT NULL,
  "responsavelId" TEXT         NOT NULL,
  "observacao"    TEXT,
  "realizadaEm"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "criadoEm"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "analises_plano_pkey" PRIMARY KEY ("id")
);

-- TAREFAS
CREATE TABLE "tarefas" (
  "id"                              TEXT             NOT NULL,
  "titulo"                          TEXT             NOT NULL,
  "descricao"                       TEXT,
  "tipo"                            "TipoTarefa"     NOT NULL DEFAULT 'MANUAL',
  "alunoId"                         TEXT,
  "responsavelId"                   TEXT,
  "prazo"                           TIMESTAMP(3),
  "urgencia"                        "UrgenciaTarefa" NOT NULL DEFAULT 'MEDIA',
  "status"                          "StatusTarefa"   NOT NULL DEFAULT 'A_FAZER',
  "urgenciaAjustadaAutomaticamente" BOOLEAN          NOT NULL DEFAULT false,
  "concluidaEm"                     TIMESTAMP(3),
  "criadoEm"                        TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm"                    TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tarefas_pkey" PRIMARY KEY ("id")
);

-- COMENTÁRIOS
CREATE TABLE "comentarios" (
  "id"       TEXT         NOT NULL,
  "alunoId"  TEXT         NOT NULL,
  "autorId"  TEXT         NOT NULL,
  "texto"    TEXT         NOT NULL,
  "mencoes"  TEXT[]       NOT NULL DEFAULT '{}',
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "comentarios_pkey" PRIMARY KEY ("id")
);

-- REGISTROS DE CHURN
CREATE TABLE "registros_churn" (
  "id"         TEXT          NOT NULL,
  "alunoId"    TEXT          NOT NULL,
  "motivo"     "MotivoChurn" NOT NULL,
  "observacao" TEXT,
  "dataChurn"  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "criadoEm"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "registros_churn_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "registros_churn_alunoId_key" ON "registros_churn"("alunoId");

-- REGISTROS DE APROVAÇÃO
CREATE TABLE "registros_aprovacao" (
  "id"             TEXT         NOT NULL,
  "alunoId"        TEXT         NOT NULL,
  "concurso"       TEXT         NOT NULL,
  "dataAprovacao"  TIMESTAMP(3) NOT NULL,
  "observacao"     TEXT,
  "criadoEm"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "registros_aprovacao_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "registros_aprovacao_alunoId_key" ON "registros_aprovacao"("alunoId");

-- FILA DIÁRIA
CREATE TABLE "fila_diaria" (
  "id"        TEXT         NOT NULL,
  "alunoId"   TEXT         NOT NULL,
  "data"      DATE         NOT NULL,
  "concluida" BOOLEAN      NOT NULL DEFAULT false,
  "criadoEm"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fila_diaria_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "fila_diaria_alunoId_data_key" ON "fila_diaria"("alunoId", "data");

-- LOGS DE IMPORTAÇÃO
CREATE TABLE "logs_importacao" (
  "id"            TEXT         NOT NULL,
  "nomeArquivo"   TEXT         NOT NULL,
  "totalLinhas"   INTEGER      NOT NULL,
  "importados"    INTEGER      NOT NULL,
  "duplicados"    INTEGER      NOT NULL,
  "erros"         INTEGER      NOT NULL,
  "detalhesErros" JSONB,
  "realizadaEm"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "logs_importacao_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- FOREIGN KEYS
-- ============================================================

ALTER TABLE "sessoes"
  ADD CONSTRAINT "sessoes_membroId_fkey"
  FOREIGN KEY ("membroId") REFERENCES "membros_equipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mudancas_fase"
  ADD CONSTRAINT "mudancas_fase_alunoId_fkey"
  FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mudancas_fase"
  ADD CONSTRAINT "mudancas_fase_autorId_fkey"
  FOREIGN KEY ("autorId") REFERENCES "membros_equipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "follow_ups"
  ADD CONSTRAINT "follow_ups_alunoId_fkey"
  FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "follow_ups"
  ADD CONSTRAINT "follow_ups_responsavelId_fkey"
  FOREIGN KEY ("responsavelId") REFERENCES "membros_equipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "analises_plano"
  ADD CONSTRAINT "analises_plano_alunoId_fkey"
  FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "analises_plano"
  ADD CONSTRAINT "analises_plano_responsavelId_fkey"
  FOREIGN KEY ("responsavelId") REFERENCES "membros_equipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tarefas"
  ADD CONSTRAINT "tarefas_alunoId_fkey"
  FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tarefas"
  ADD CONSTRAINT "tarefas_responsavelId_fkey"
  FOREIGN KEY ("responsavelId") REFERENCES "membros_equipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "comentarios"
  ADD CONSTRAINT "comentarios_alunoId_fkey"
  FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "comentarios"
  ADD CONSTRAINT "comentarios_autorId_fkey"
  FOREIGN KEY ("autorId") REFERENCES "membros_equipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "registros_churn"
  ADD CONSTRAINT "registros_churn_alunoId_fkey"
  FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "registros_aprovacao"
  ADD CONSTRAINT "registros_aprovacao_alunoId_fkey"
  FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
