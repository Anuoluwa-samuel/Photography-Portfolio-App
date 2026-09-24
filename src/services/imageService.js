// Sharp-based image processing: everything uploaded is normalized to WebP.
//
// Storage has two modes, chosen by whether BLOB_READ_WRITE_TOKEN is set:
//   * Vercel Blob  — serverless. Sharp renders to a buffer which is uploaded; the stored URL is
//                    absolute (https://….public.blob.vercel-storage.com/…).
//   * local disk   — development and any host with a persistent volume. Stored URL stays
//                    relative (/uploads/gallery/…), which is what existing rows already hold.
// Deletes accept either shape, so rows written before a Blob migration still clean up correctly.
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const env = require('../config/environment');

const USE_BLOB = !!env.BLOB_TOKEN;

// Only touch the filesystem when we actually own one. On Vercel everything outside /tmp is
// read-only, and an mkdir at import time would crash the function before it served a request.
if (!USE_BLOB) {
  fs.mkdirSync(path.join(env.UPLOAD_DIR, 'gallery'), { recursive: true });
  fs.mkdirSync(path.join(env.UPLOAD_DIR, 'site'), { recursive: true });
}

/** Store a WebP buffer at `relPath` (e.g. "gallery/123-abc-full.webp"); returns the URL to save. */
async function putFile(relPath, buffer) {
  if (USE_BLOB) {
    const { put } = require('@vercel/blob');
    const res = await put(relPath, buffer, {
      access: 'public',
      token: env.BLOB_TOKEN,
      contentType: 'image/webp',
      addRandomSuffix: false, // the caller's timestamp+random stamp already makes these unique
    });
    return res.url;
  }
  const abs = path.join(env.UPLOAD_DIR, relPath);
  await fs.promises.mkdir(path.dirname(abs), { recursive: true });
  await fs.promises.writeFile(abs, buffer);
  return `/uploads/${relPath}`;
}

/** Is this URL something we uploaded (and may therefore delete)? Seed photos point at Unsplash
 *  and must never be touched — and on Blob, deleting a URL we don't own is an error. */
function isOwned(url) {
  if (!url) return false;
  if (url.startsWith('/uploads/')) return true;                     // local disk
  return /^https?:\/\/[^/]*\.public\.blob\.vercel-storage\.com\//i.test(url);  // Vercel Blob
}

/** Delete a stored image by the URL held in the database. Never throws — a failed cleanup
 *  must not take down the request that deleted the row. */
async function removeFile(url) {
  if (!isOwned(url)) return;
  try {
    if (url.startsWith('/uploads/')) {
      await fs.promises.rm(path.join(env.UPLOAD_DIR, url.replace(/^\/uploads\//, '')), { force: true });
      return;
    }
    const { del } = require('@vercel/blob');
    await del(url, { token: env.BLOB_TOKEN });
  } catch (err) {
    console.error('[images] could not remove', url, '-', err.message);
  }
}

/** One uploaded project photo -> a 2000px "full" WebP and a 900px "thumb" WebP. */
async function processProjectImage(buffer) {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const img = sharp(buffer, { failOn: 'none' }).rotate();
  const meta = await img.metadata();
  const full = await img.clone().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
                        .webp({ quality: 84 }).toBuffer();
  const thumb = await img.clone().resize({ width: 900, height: 900, fit: 'inside', withoutEnlargement: true })
                         .webp({ quality: 78 }).toBuffer({ resolveWithObject: true });
  const [src_full, src_thumb] = await Promise.all([
    putFile(`gallery/${stamp}-full.webp`, full),
    putFile(`gallery/${stamp}-thumb.webp`, thumb.data),
  ]);
  return {
    src_full,
    src_thumb,
    width: thumb.info.width || meta.width || 800,
    height: thumb.info.height || meta.height || 1000,
  };
}

/** One site-chrome image (hero / about portrait) -> a single cropped 4:5 WebP. */
async function processSiteImage(buffer, key) {
  const name = `${key}-${Date.now()}.webp`;
  const out = await sharp(buffer, { failOn: 'none' }).rotate()
    .resize({ width: 1200, height: 1500, fit: 'cover', position: 'attention' })
    .webp({ quality: 84 }).toBuffer();
  return putFile(`site/${name}`, out);
}

const removeGalleryFile = (url) => removeFile(url);
const removeSiteFile = (url) => removeFile(url);

module.exports = { processProjectImage, processSiteImage, removeGalleryFile, removeSiteFile, putFile, removeFile, isOwned, USE_BLOB };
