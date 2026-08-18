import multer, { memoryStorage } from "multer";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const UPLOADS_DIR = join(__dirname, "..", "uploads");
export const UPLOADS_URL = "/api/uploads";

mkdirSync(UPLOADS_DIR, { recursive: true });

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".txt",
  ".odt",
  ".png",
  ".jpg",
  ".jpeg",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ALLOWED_EXTENSIONS.has(ext) ? ext : ""}`);
  },
});

function fileFilter(_req, file, cb) {
  const ext = extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.has(ext)) return cb(null, true);
  cb(new Error("Unsupported file type — use PDF, Word, TXT or an image"));
}

// Multer errors arrive through the error middleware; the JSON error handler in
// index.js converts them into { error: message } responses.
export const uploadResume = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

// In-memory upload for the text-packet transport (POST /api/text-files): the
// file bytes are encoded into packets and never written to disk.
export const uploadTextFile = multer({
  storage: memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

// DB stores a URL path (/api/uploads/<uuid>.ext), not a filesystem path.
export function toUploadUrl(file) {
  return file ? `${UPLOADS_URL}/${file.filename}` : null;
}

// Reverse: URL path -> filesystem path, so stored files can be deleted.
export function storedFilePath(url) {
  if (!url || !url.startsWith(UPLOADS_URL)) return null;
  return join(UPLOADS_DIR, url.slice(UPLOADS_URL.length + 1));
}