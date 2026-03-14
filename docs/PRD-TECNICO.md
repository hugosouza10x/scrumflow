# PRD Técnico — ScrumFlow

## 1. Visão do Produto

### 1.1 Objetivo
Sistema web interno para gestão de projetos e tarefas com foco em Scrum, substituindo o Notion, com ênfase em:
- Qualidade do preenchimento dos cards
- Quebra de demandas em tarefas executáveis
- Controle de backlog, sprint, cards, subtarefas, bloqueios e updates diários
- Visibilidade gerencial confiável

### 1.2 Público
- Desenvolvedores
- Tech leads
- Gestores de tecnologia

### 1.3 Princípios
- Simples para colaboradores, poderoso para gestão
- Preenchimento rápido, poucos campos obrigatórios
- Interface clara e produtiva

---

## 2. Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Next.js API Routes + Server Actions (híbrido) |
| Banco | Supabase (PostgreSQL) |
| ORM | Prisma |
| Arquivos | Amazon S3 (compatível) |
| Auth | E-mail + senha (inicial) |
| Estado/Cache | React Query (server state) + Zustand (UI/local state quando necessário) |
| Kanban | @dnd-kit/core + @dnd-kit/sortable |

---

## 3. Modelo de Trabalho

```
Demanda (Backlog) → Card (refinado) → Subtarefas → Sprint
```

- **Demanda**: pedido bruto, ainda não refinado.
- **Card**: item estruturado, elegível para sprint (responsável, critério de aceite, estimativa, ≥1 subtarefa).
- **Subtarefas**: passos executáveis do card.
- **Sprint**: conjunto de cards planejados para um ciclo.

---

## 4. Módulos do Sistema

1. **Projetos** — CRUD, status, prioridade, líder, equipe, datas
2. **Backlog** — Demandas com status de refinamento
3. **Sprint** — Ciclos com capacidade, membros, status
4. **Cards** — CRUD, status, dependências, bloqueio, anexos, comentários
5. **Subtarefas** — Por card, responsável, status, estimativa
6. **Atualizações diárias** — O que fiz, concluí, próximo passo, bloqueio
7. **Dashboard gerencial** — Métricas, atrasos, capacidade vs carga
8. **Usuários** — Cadastro, cargos, status ativo/inativo

---

## 5. Regras de Negócio

### 5.1 Elegibilidade de card para sprint
Um card **não** pode entrar na sprint se:
- não tiver responsável
- não tiver critério de aceite
- não tiver estimativa
- não tiver pelo menos uma subtarefa

### 5.2 Bloqueios
- Card bloqueado **obrigatoriamente** possui motivo de bloqueio.

### 5.3 Atualização
- Cards sem atualização há mais de 2 dias devem ser considerados **desatualizados** (indicador no dashboard e listas).

### 5.4 Permissões por cargo (inicial)
- **admin**: gerencia usuários
- **gestor**, **tech_lead**: criar projetos, sprints, cards
- **desenvolvedor**, **analista**: atualizar cards, subtarefas e updates diários

---

## 6. Modelo de Dados (Resumo)

- **User**: id, nome, email, senha (hash), cargoId, status, createdAt
- **Cargo**: id, nome, slug (admin, gestor, tech_lead, desenvolvedor, analista)
- **Projeto**: id, nome, descrição, status, prioridade, liderId, dataInicio, dataPrevisao, equipe (relação)
- **Demanda**: título, descrição, solicitante, origem, impacto, prioridade, tipo, statusRefinamento, projetoId
- **Sprint**: nome, objetivo, dataInicio, dataFim, capacidadeTotal, status, projetoId, membros (relação)
- **Card**: título, descrição, criteriosAceite, responsavelId, prioridade, estimativa, prazo, status, sprintId, projetoId, bloqueado, motivoBloqueio, dependências (self-relation)
- **Subtarefa**: título, responsavelId, status, prazo, estimativa, cardId
- **CardAnexo**: nome, tipo, tamanho, key/url, userId, cardId, createdAt
- **CardComentario**: conteudo, userId, cardId, createdAt
- **CardHistorico**: alterações (JSON ou campos) para auditoria
- **UpdateDiario**: hoje, concluido, proximoPasso, bloqueio, userId, data
- **CardTemplate**: nome, slug (bug, nova_feature, melhoria, infraestrutura), subtarefasSugeridas (JSON)
- **Etiqueta**: nome, cor, projetoId (opcional)

---

## 7. Funcionalidades Detalhadas

### 7.1 Kanban
- Colunas por status do card
- Drag and drop com dnd-kit
- Atualização de status via API ao soltar

### 7.2 Cards
- Filtros (status, responsável, sprint, projeto, etiquetas)
- Busca por título/descrição
- Comentários
- Histórico de alterações
- Anexos (upload S3, metadados no Postgres)
- Etiquetas

### 7.3 Templates de demanda
- Tipos: bug, nova_feature, melhoria, infraestrutura
- Cada template pode sugerir lista de subtarefas padrão

### 7.4 Dashboard gerencial
- Cards por status
- Cards bloqueados
- Cards atrasados
- Cards sem atualização (>2 dias)
- Tarefas por colaborador
- Progresso da sprint
- Capacidade vs carga

---

## 8. Requisitos Não Funcionais

- **Arquitetura**: limpa, camadas (domínio, aplicação, infraestrutura quando fizer sentido)
- **Código**: reutilizável, tipagem forte, validação (ex.: Zod), tratamento de erros
- **Segurança**: hash de senha (bcrypt ou similar), envio de anexos com validação de tipo/tamanho, URLs assinadas ou controle de acesso no S3
- **Escalabilidade**: estrutura preparada para crescer (módulos, serviços, eventos futuros)

---

## 9. Entregas Fase 1 (Este PRD)

1. PRD técnico (este documento)
2. Arquitetura e estrutura de pastas
3. Schema Prisma + tipos TypeScript
4. Migrations iniciais
5. APIs iniciais (projetos, backlog, sprints, cards, usuários, auth)
6. Páginas iniciais (login, dashboard, projetos, backlog, kanban)
7. Fluxo de upload de anexos (S3)
8. Cadastro de usuários com cargos e controle por cargo

---

## 10. Glossário

| Termo | Definição |
|-------|-----------|
| Demanda | Item no backlog ainda não refinado |
| Card | Item de trabalho refinado, elegível para sprint |
| Subtarefa | Passo executável dentro de um card |
| Refinamento | Processo de transformar demanda em card |
| Update diário | Registro rápido do que foi feito/planejado no dia |
