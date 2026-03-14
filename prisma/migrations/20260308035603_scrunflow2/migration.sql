-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ATIVO', 'INATIVO');

-- CreateEnum
CREATE TYPE "ProjetoStatus" AS ENUM ('ATIVO', 'PAUSADO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusRefinamento" AS ENUM ('NAO_REFINADO', 'EM_REFINAMENTO', 'PRONTO_PARA_SPRINT');

-- CreateEnum
CREATE TYPE "SprintStatus" AS ENUM ('PLANEJADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('BACKLOG', 'PRONTO_PARA_SPRINT', 'A_FAZER', 'EM_ANDAMENTO', 'EM_REVISAO', 'BLOQUEADO', 'HOMOLOGACAO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "SubtarefaStatus" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "Prioridade" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'URGENTE');

-- CreateTable
CREATE TABLE "Cargo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cargo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "cargo_id" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Projeto" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "status" "ProjetoStatus" NOT NULL DEFAULT 'ATIVO',
    "prioridade" "Prioridade" NOT NULL DEFAULT 'MEDIA',
    "lider_id" TEXT,
    "data_inicio" DATE,
    "data_previsao" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Projeto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projeto_membro" (
    "id" TEXT NOT NULL,
    "projeto_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projeto_membro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Demanda" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "solicitante_id" TEXT,
    "origem" TEXT,
    "impacto" TEXT,
    "prioridade" "Prioridade" NOT NULL DEFAULT 'MEDIA',
    "tipo" TEXT,
    "status_refinamento" "StatusRefinamento" NOT NULL DEFAULT 'NAO_REFINADO',
    "projeto_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Demanda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sprint" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "objetivo" TEXT,
    "data_inicio" DATE NOT NULL,
    "data_fim" DATE NOT NULL,
    "capacidade_total" INTEGER,
    "status" "SprintStatus" NOT NULL DEFAULT 'PLANEJADA',
    "projeto_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sprint_membro" (
    "id" TEXT NOT NULL,
    "sprint_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "capacidade" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sprint_membro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "criterios_aceite" TEXT,
    "responsavel_id" TEXT,
    "prioridade" "Prioridade" NOT NULL DEFAULT 'MEDIA',
    "estimativa" INTEGER,
    "prazo" DATE,
    "status" "CardStatus" NOT NULL DEFAULT 'BACKLOG',
    "sprint_id" TEXT,
    "projeto_id" TEXT NOT NULL,
    "bloqueado" BOOLEAN NOT NULL DEFAULT false,
    "motivo_bloqueio" TEXT,
    "ultima_atualizacao" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_dependencia" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "dependencia_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_dependencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subtarefa" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "responsavel_id" TEXT,
    "status" "SubtarefaStatus" NOT NULL DEFAULT 'PENDENTE',
    "prazo" DATE,
    "estimativa" INTEGER,
    "card_id" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subtarefa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardComentario" (
    "id" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardComentario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_historico" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "campo" TEXT,
    "valor_anterior" TEXT,
    "valor_novo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_historico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_anexo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_anexo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "update_diario" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "trabalhei_hoje" TEXT,
    "concluido" TEXT,
    "proximo_passo" TEXT,
    "bloqueio" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "update_diario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Etiqueta" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT NOT NULL DEFAULT '#6366f1',
    "projeto_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Etiqueta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_etiqueta" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "etiqueta_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_etiqueta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_template" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "subtarefas_sugeridas" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "card_template_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cargo_slug_key" ON "Cargo"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "projeto_membro_projeto_id_user_id_key" ON "projeto_membro"("projeto_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sprint_membro_sprint_id_user_id_key" ON "sprint_membro"("sprint_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "card_dependencia_card_id_dependencia_id_key" ON "card_dependencia"("card_id", "dependencia_id");

-- CreateIndex
CREATE UNIQUE INDEX "update_diario_user_id_data_key" ON "update_diario"("user_id", "data");

-- CreateIndex
CREATE UNIQUE INDEX "card_etiqueta_card_id_etiqueta_id_key" ON "card_etiqueta"("card_id", "etiqueta_id");

-- CreateIndex
CREATE UNIQUE INDEX "card_template_slug_key" ON "card_template"("slug");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "Cargo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Projeto" ADD CONSTRAINT "Projeto_lider_id_fkey" FOREIGN KEY ("lider_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projeto_membro" ADD CONSTRAINT "projeto_membro_projeto_id_fkey" FOREIGN KEY ("projeto_id") REFERENCES "Projeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projeto_membro" ADD CONSTRAINT "projeto_membro_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demanda" ADD CONSTRAINT "Demanda_solicitante_id_fkey" FOREIGN KEY ("solicitante_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demanda" ADD CONSTRAINT "Demanda_projeto_id_fkey" FOREIGN KEY ("projeto_id") REFERENCES "Projeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sprint" ADD CONSTRAINT "Sprint_projeto_id_fkey" FOREIGN KEY ("projeto_id") REFERENCES "Projeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprint_membro" ADD CONSTRAINT "sprint_membro_sprint_id_fkey" FOREIGN KEY ("sprint_id") REFERENCES "Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprint_membro" ADD CONSTRAINT "sprint_membro_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_sprint_id_fkey" FOREIGN KEY ("sprint_id") REFERENCES "Sprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_projeto_id_fkey" FOREIGN KEY ("projeto_id") REFERENCES "Projeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_dependencia" ADD CONSTRAINT "card_dependencia_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_dependencia" ADD CONSTRAINT "card_dependencia_dependencia_id_fkey" FOREIGN KEY ("dependencia_id") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subtarefa" ADD CONSTRAINT "Subtarefa_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subtarefa" ADD CONSTRAINT "Subtarefa_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardComentario" ADD CONSTRAINT "CardComentario_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardComentario" ADD CONSTRAINT "CardComentario_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_historico" ADD CONSTRAINT "card_historico_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_historico" ADD CONSTRAINT "card_historico_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_anexo" ADD CONSTRAINT "card_anexo_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_anexo" ADD CONSTRAINT "card_anexo_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "update_diario" ADD CONSTRAINT "update_diario_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Etiqueta" ADD CONSTRAINT "Etiqueta_projeto_id_fkey" FOREIGN KEY ("projeto_id") REFERENCES "Projeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_etiqueta" ADD CONSTRAINT "card_etiqueta_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_etiqueta" ADD CONSTRAINT "card_etiqueta_etiqueta_id_fkey" FOREIGN KEY ("etiqueta_id") REFERENCES "Etiqueta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
