/**
 * Cliente S3-compatível para upload de anexos.
 * Configurar S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY no .env
 * Compatível com AWS S3, MinIO, Supabase Storage (S3 API).
 */

const endpoint = process.env.S3_ENDPOINT;
const bucket = process.env.S3_BUCKET ?? "scrumflow-anexos";
const region = process.env.S3_REGION ?? "us-east-1";
const accessKey = process.env.S3_ACCESS_KEY;
const secretKey = process.env.S3_SECRET_KEY;

/** Tamanho máximo por arquivo (10 MB) */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Tipos MIME permitidos */
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "application/zip",
];

export function isS3Configured(): boolean {
  return Boolean(endpoint && accessKey && secretKey);
}

/**
 * Gera a chave (path) do objeto no bucket.
 * Estrutura: projetos/{projetoId}/cards/{cardId}/{uuid}-{nomeSanitizado}
 */
export function buildS3Key(projetoId: string, cardId: string, fileName: string): string {
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
  const uuid = crypto.randomUUID().slice(0, 8);
  return `projetos/${projetoId}/cards/${cardId}/${uuid}-${sanitized}`;
}

/**
 * Retorna a URL pública do arquivo (se S3_PUBLIC_URL estiver configurado)
 * ou indica que a URL deve ser obtida via presigned get.
 */
export function getPublicUrl(key: string): string | null {
  const base = process.env.S3_PUBLIC_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/${key}`;
}

/**
 * Upload via presigned URL ou SDK.
 * Por simplicidade, este módulo apenas define a interface; a implementação
 * real pode usar @aws-sdk/client-s3 ou similar. Aqui exportamos funções
 * que o serviço de anexos usará.
 */
export const S3_CONFIG = {
  endpoint,
  bucket,
  region,
  accessKey,
  secretKey,
} as const;
