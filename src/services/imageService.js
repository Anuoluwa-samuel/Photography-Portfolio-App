// Sharp-based image processing: everything uploaded is normalized to WebP.
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const env = require('../config/environment');

const GALLERY_DIR = path.join(env.UPLOAD_DIR, 'gallery');
const SITE_DIR = path.join(env.UPLOAD_DIR, 'site');
fs.mkdirSync(GALLERY_DIR, { recursive: true });
fs.mkdirSync(SITE_DIR, { recursive: true });

/** One uploaded project photo -> a 2000px "full" WebP and a 900px "thumb" WebP on disk. */
async function processProjectImage(buffer) {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const base = path.join(GALLERY_DIR, stamp);
  const img = sharp(buffer, { failOn: 'none' }).rotate();
  const meta = await img.metadata();
  await img.clone().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true }).webp({ quality: 84 }).toFile(`${base}-full.webp`);
  const thumbInfo = await img.clone().resize({ width: 900, height: 900, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toFile(`${base}-thumb.webp`);
  return {
    src_full: `/uploads/gallery/${stamp}-full.webp`,
    src_thumb: `/uploads/gallery/${stamp}-thumb.webp`,
    width: thumbInfo.width || meta.width || 800,
    height: thumbInfo.height || meta.height || 1000,
  };
}

/** One site-chrome image (hero / about portrait) -> a single cropped 4:5 WebP. */
async function processSiteImage(buffer, key) {
  const name = `${key}-${Date.now()}.webp`;
  await sharp(buffer, { failOn: 'none' }).rotate()
    .resize({ width: 1200, height: 1500, fit: 'cover', position: 'attention' })
    .webp({ quality: 84 }).toFile(path.join(SITE_DIR, name));
  return `/uploads/site/${name}`;
}

function removeGalleryFile(url) { fs.rm(path.join(GALLERY_DIR, path.basename(url)), () => {}); }
function removeSiteFile(url) { fs.rm(path.join(SITE_DIR, path.basename(url)), () => {}); }

module.exports = { processProjectImage, processSiteImage, removeGalleryFile, removeSiteFile };
