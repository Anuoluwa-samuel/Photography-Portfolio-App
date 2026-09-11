// Shared multer config for admin image uploads: memory storage, image-only, 25MB/20 files.
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 20 },
  fileFilter: (req, file, cb) => cb(null, /^image\/(jpeg|png|webp|avif|tiff|heic|heif)$/.test(file.mimetype)),
});

module.exports = upload;
