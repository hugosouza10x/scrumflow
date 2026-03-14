# ScrumFlow

Sistema web de gestão de projetos e tarefas para times de tecnologia com foco em Scrum. Substitui o uso de Notion para backlog, sprint, cards e visibilidade gerencial.

## Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui (Radix), React Query, dnd-kit
- **Backend**: Next.js API Routes + Server Actions
- **Banco**: Supabase (PostgreSQL) + Prisma
- **Arquivos**: S3-compatível (AWS S3, MinIO ou Supabase Storage)
- **Auth**: E-mail + senha (sessão em cookie JWT)

## Pré-requisitos

- Node.js 18+
- Conta Supabase (Postgres)
- (Opcional) Bucket S3 ou compatível para anexos

## Setup

### 1. Instalar dependências

```bash
npm install
```

### 2. Variáveis de ambiente

Copie o exemplo e preencha:

```bash
cp .env.example .env.local
```

- **DATABASE_URL**: connection string do Postgres (Supabase: Project Settings → Database).
- **AUTH_SECRET**: chave secreta para assinatura do JWT (ex.: `openssl rand -base64 32`).
- **S3_***: apenas se for usar anexos em nuvem (ver `docs/FLUXO-ANEXOS-S3.md`).

### 3. Banco de dados

```bash
# Criar tabelas (Supabase/Postgres)
npx prisma migrate dev --name init

# Popular cargos e templates iniciais + usuário admin
npm run db:seed
```

Usuário admin padrão após o seed: **admin@scrumflow.local** / **admin123** (altere em produção).

### 4. Rodar o projeto

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000). Faça login e use o dashboard.

## Estrutura principal

- **docs/** — PRD técnico, arquitetura, fluxo de anexos
- **app/** — Rotas (auth, dashboard, API)
- **components/** — UI (shadcn), layout, kanban, etc.
- **lib/** — Prisma, auth, sessão, S3, validações Zod
- **services/** — Regras de negócio (usuário, projeto, card, anexo)
- **types/** — Tipos de domínio e API
- **prisma/** — Schema e migrations

## Módulos

1. **Projetos** — CRUD, líder, equipe, datas  
2. **Backlog** — Demandas e refinamento (API e UI em evolução)  
3. **Sprints** — Ciclos e capacidade (API e UI em evolução)  
4. **Cards** — CRUD, status, subtarefas, anexos, comentários, histórico  
5. **Atualizações diárias** — Registro rápido (API em evolução)  
6. **Dashboard** — Métricas (cards por status, bloqueados, atrasados, sem atualização)  
7. **Usuários** — Cadastro e cargos (admin)

## Cargos e permissões

- **admin** — Gerencia usuários  
- **gestor** / **tech_lead** — Criam projetos, sprints e cards  
- **desenvolvedor** / **analista** — Atualizam cards, subtarefas e updates diários  

Estrutura preparada para permissões mais granulares no futuro.

## Scripts

- `npm run dev` — Desenvolvimento  
- `npm run build` — Build de produção  
- `npm run db:migrate` — Rodar migrations  
- `npm run db:seed` — Seed (cargos, templates, admin)  
- `npm run db:studio` — Abrir Prisma Studio  

## Licença

Uso interno.
