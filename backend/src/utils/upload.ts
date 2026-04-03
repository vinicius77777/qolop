import multer from "multer";

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

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

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
