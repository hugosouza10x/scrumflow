# Fluxo de upload de anexos (S3)

## Visão geral

Os anexos dos cards são enviados para um bucket S3-compatível (AWS S3, MinIO ou Supabase Storage com API S3). Os **metadados** ficam no Postgres (tabela `CardAnexo`); o **arquivo** fica no bucket.

## Configuração (.env)

```env
S3_ENDPOINT="https://..."   # Opcional para AWS; obrigatório para MinIO/Supabase
S3_REGION="us-east-1"
S3_BUCKET="scrumflow-anexos"
S3_ACCESS_KEY="..."
S3_SECRET_KEY="..."
S3_PUBLIC_URL=""            # Opcional: URL base pública do bucket para links diretos
```

Se `S3_*` não estiver configurado, a API ainda aceita o upload e grava o registro no banco com `key` prefixada por `local/`, mas o arquivo não é persistido em nenhum storage (apenas metadados). Útil para desenvolvimento.

## Estrutura da chave no bucket

```
projetos/{projetoId}/cards/{cardId}/{uuid}-{nomeSanitizado}
```

- Organização por projeto e card.
- UUID evita colisão de nomes.
- Nome do arquivo sanitizado (apenas caracteres seguros).

## Limites e segurança

- **Tamanho máximo**: 10 MB por arquivo (`MAX_FILE_SIZE` em `lib/s3.ts`).
- **Tipos permitidos**: lista em `ALLOWED_MIME_TYPES` (imagens, PDF, Office, texto, zip).
- Validação é feita no servidor antes do upload e antes de criar o registro.

## Fluxo na API

1. **POST /api/cards/[id]/anexos**  
   - Content-Type: `multipart/form-data`, campo `file`.
2. Servidor valida tipo e tamanho.
3. Gera a `key` (path no bucket).
4. Se S3 configurado: envia o buffer para o bucket via `@aws-sdk/client-s3` (`PutObjectCommand`).
5. Cria registro em `CardAnexo` com: `nome`, `tipo`, `tamanho`, `key`, `cardId`, `userId`, `createdAt`.
6. Resposta: objeto do anexo (com `url` se `S3_PUBLIC_URL` estiver definido).

## Download

- Se houver `S3_PUBLIC_URL`, o front pode montar o link direto: `${S3_PUBLIC_URL}/${anexo.key}`.
- Caso contrário, é necessário implementar um endpoint que gera **presigned URL** (GET) para download temporário, usando o SDK S3.

## Múltiplos anexos

Cada card pode ter vários anexos. A listagem é **GET /api/cards/[id]/anexos**. A exclusão pode ser implementada em **DELETE /api/cards/[id]/anexos/[anexoId]** (remover do bucket e deletar o registro no banco).
