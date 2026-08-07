import fs from "fs";
import path from "path";
import multer from "multer";
import { getPublicStorageUrl, isSupabaseConfigured, storageBucket, supabase } from "../lib/supabase";

const DEFAULT_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024;

function parseAllowedMimeTypes(value?: string): string[] {
  if (!value) {
    return DEFAULT_ALLOWED_MIME_TYPES;
  }

  const mimeTypes = value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return mimeTypes.length > 0 ? mimeTypes : DEFAULT_ALLOWED_MIME_TYPES;
}

export const allowedUploadMimeTypes = parseAllowedMimeTypes(
  process.env.ALLOWED_UPLOAD_MIME_TYPES
);

export const maxUploadFileSize = Number.isFinite(
  Number(process.env.MAX_UPLOAD_FILE_SIZE)
)
  ? Number(process.env.MAX_UPLOAD_FILE_SIZE)
  : DEFAULT_MAX_FILE_SIZE;

const storage = multer.memoryStorage();

function imageFileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  if (allowedUploadMimeTypes.includes(file.mimetype.toLowerCase())) {
    return cb(null, true);
  }

  cb(
    new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname)
  );
}

export function createImageUpload() {
  return multer({
    storage,
    limits: { fileSize: maxUploadFileSize },
    fileFilter: imageFileFilter,
  });
}

function normalizeFileName(originalName: string): string {
  const base = path
    .basename(originalName)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .toLowerCase();

  return `${Date.now()}-${base}`;
}

async function saveToLocalDisk(file: Express.Multer.File): Promise<string> {
  const uploadsDir = path.join(process.cwd(), "uploads");
  fs.mkdirSync(uploadsDir, { recursive: true });

  const filename = normalizeFileName(file.originalname);
  const filePath = path.join(uploadsDir, filename);

  fs.writeFileSync(filePath, file.buffer);

  return `/uploads/${filename}`;
}

async function saveToSupabaseStorage(file: Express.Multer.File): Promise<string> {
  const client = supabase;

  if (!client) {
    return saveToLocalDisk(file);
  }

  const filePath = normalizeFileName(file.originalname);

  const { error } = await client.storage
    .from(storageBucket)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) {
    console.error("[UPLOAD] supabase_storage_upload_failed", {
      error: error.message,
      bucket: storageBucket,
    });

    throw new Error("Falha ao enviar imagem para o armazenamento");
  }

  return getPublicStorageUrl(storageBucket, filePath);
}

/**
 * Persiste o arquivo enviado:
 * - Supabase configurado  -> envia para o bucket e retorna a URL pública
 * - Supabase não configurado -> grava em disco local (dev) e retorna `/uploads/...`
 */
export async function saveUploadedImage(
  file: Express.Multer.File
): Promise<string> {
  if (isSupabaseConfigured) {
    return saveToSupabaseStorage(file);
  }

  return saveToLocalDisk(file);
}

/**
 * Remove o arquivo do storage (usado ao trocar/remover imagens).
 * Em dev (disco local) apenas tenta apagar; no Supabase remove do bucket.
 */
export async function deleteUploadedImage(fileUrl: string): Promise<void> {
  if (!fileUrl) {
    return;
  }

  if (fileUrl.startsWith("/uploads/")) {
    const filePath = path.join(process.cwd(), "uploads", path.basename(fileUrl));

    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error("[UPLOAD] local_delete_failed", { fileUrl, err });
      }
    }

    return;
  }

  const isSupabaseUrl = fileUrl.includes("/storage/v1/object/public/");

  if (isSupabaseUrl && supabase) {
    const urlWithoutQuery = fileUrl.split("?")[0];
    const parts = urlWithoutQuery.split(`/storage/v1/object/public/`);

    if (parts.length === 2) {
      const [bucket, ...rest] = parts[1].split("/");

      if (bucket && rest.length > 0) {
        const { error } = await supabase.storage
          .from(bucket)
          .remove([rest.join("/")]);

        if (error) {
          console.error("[UPLOAD] supabase_storage_delete_failed", {
            fileUrl,
            error: error.message,
          });
        }
      }
    }
  }
}
