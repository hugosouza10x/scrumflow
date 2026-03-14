# Arquitetura — ScrumFlow

## 1. Decisões arquiteturais

### 1.1 Next.js App Router + API Routes + Server Actions
- **App Router**: rotas em `app/`, layouts e loading/error boundaries nativos.
- **Server Actions**: para mutações simples (forms, updates) com validação no servidor e menos boilerplate.
- **API Routes**: para endpoints consumidos por cliente (React Query), integrações externas e upload (multipart/form-data). Mantemos APIs RESTful em `app/api/`.

### 1.2 Camadas (onde fizer sentido)
- **Domínio**: entidades e regras puras (tipos, enums, validações de regra de negócio).
- **Aplicação**: casos de uso (services que orquestram Prisma + regras).
- **Infraestrutura**: Prisma (repositórios implícitos nos services), S3, Supabase Auth (futuro).
- **Apresentação**: componentes React, páginas, hooks.

Não aplicamos DDD completo; usamos “feature folders” por módulo (projetos, cards, sprints, etc.) com services reutilizáveis.

### 1.3 Estado
- **React Query**: dados do servidor (listas, detalhes, invalidação após mutations).
- **Zustand**: estado de UI (sidebar aberta, filtros em memória, modais) quando não precisar ser persistido na URL.

### 1.4 Validação e tipos
- **Zod**: validação de inputs (API e Server Actions) e inferência de tipos.
- **Tipos compartilhados**: `types/` e tipos gerados/derivados do Prisma quando possível.

### 1.5 Autenticação (fase 1)
- E-mail + senha, sessão em cookie (NextAuth ou implementação mínima com JWT em httpOnly cookie).
- Middleware para proteger rotas por cargo (admin, gestor, tech_lead, etc.).

---

## 2. Estrutura de pastas

```
scrumflow-cursor/
├── app/
│   ├── (auth)/                    # Grupo de rotas de autenticação
│   │   ├── login/
│   │   └── layout.tsx
│   ├── (dashboard)/               # Grupo com layout do app (sidebar, header)
│   │   ├── layout.tsx
│   │   ├── page.tsx                # Dashboard gerencial
│   │   ├── projetos/
│   │   ├── backlog/
│   │   ├── sprints/
│   │   ├── cards/
│   │   └── usuarios/               # Admin
│   ├── api/
│   │   ├── auth/
│   │   ├── projetos/
│   │   ├── demandas/
│   │   ├── sprints/
│   │   ├── cards/
│   │   ├── anexos/
│   │   ├── updates/
│   │   └── usuarios/
│   └── layout.tsx
├── components/
│   ├── ui/                        # shadcn/ui
│   ├── layout/                    # Sidebar, Header
│   ├── kanban/                    # Board, Column, Card
│   ├── cards/                     # Formulários e listas de cards
│   ├── projetos/
│   ├── backlog/
│   └── shared/
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── s3.ts
│   ├── validations/               # Schemas Zod
│   └── utils.ts
├── services/                      # Camada de aplicação
│   ├── projeto.service.ts
│   ├── demanda.service.ts
│   ├── sprint.service.ts
│   ├── card.service.ts
│   ├── usuario.service.ts
│   ├── anexo.service.ts
│   └── update-diario.service.ts
├── types/
│   ├── index.ts                   # Re-exports
│   ├── api.ts                     # Payloads e respostas
│   └── domain.ts                  # Enums e tipos de domínio
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── docs/
│   ├── PRD-TECNICO.md
│   └── ARQUITETURA.md
├── .env.local
├── next.config.js
├── tailwind.config.ts
├── package.json
└── tsconfig.json
```

---

## 3. Fluxo de dados

### 3.1 Leitura (ex.: lista de cards)
1. Página ou componente chama `useQuery` (React Query) com key e fetcher.
2. Fetcher chama `GET /api/cards` (ou similar).
3. API route usa `CardService.list()` que usa Prisma.
4. Resposta JSON tipada retorna ao cliente; React Query cacheia.

### 3.2 Mutação (ex.: criar card)
1. Formulário submete (ou Server Action ou `useMutation` chamando API).
2. Server Action / API valida com Zod e chama `CardService.create()`.
3. Service aplica regras (elegibilidade, etc.) e persiste via Prisma.
4. Invalidação de queries (ex.: `cards`, `sprint/:id`) para refetch.

### 3.3 Upload de anexos
1. Cliente envia arquivo para `POST /api/cards/[id]/anexos` (multipart).
2. API valida tipo/tamanho, gera key única (ex.: `projetos/{projetoId}/cards/{cardId}/{uuid}-{nome}`).
3. Serviço S3 faz upload; metadados (nome, tipo, tamanho, key, userId, cardId) são salvos no Postgres.
4. Resposta retorna URL (assinada ou pública conforme política) e registro do anexo.

---

## 4. Segurança

- Senhas: hash com bcrypt (ou equivalente) antes de persistir.
- Rotas API: middleware verifica sessão e, quando necessário, cargo.
- S3: políticas de bucket restritas; URLs assinadas para download quando não for público.
- Validação: sempre Zod no servidor; nunca confiar apenas no cliente.

---

## 5. Evolução futura

- Permissões granulares: tabela `permissao` por cargo/recurso/ação.
- Supabase Auth: trocar auth custom por Supabase Auth mantendo mesma interface (getSession, etc.).
- Eventos: lógica “card entrou na sprint” ou “card bloqueado” pode emitir eventos para notificações ou integrações.
