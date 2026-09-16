const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MIN_FILE_SIZE_BYTES = 10; // 10 bytes (prevent zero/corrupt payload)

/**
 * Calculates SHA-256 hash of a buffer or base64 string
 */
function computeImageHash(bufferOrBase64) {
  const buffer = Buffer.isBuffer(bufferOrBase64)
    ? bufferOrBase64
    : Buffer.from(bufferOrBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, ''), 'base64');
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Validates uploaded image payload (base64 or buffer)
 */
function validateImagePayload({ fileName, fileData, mimeType }) {
  if (!fileData) {
    return { valid: false, error: 'Image file data is required.' };
  }

  // Extract base64 and mime
  let rawMime = mimeType || '';
  let cleanBase64 = fileData;

  const headerMatch = fileData.match(/^data:([a-zA-Z0-9/+]+);base64,(.+)$/);
  if (headerMatch) {
    rawMime = headerMatch[1].toLowerCase();
    cleanBase64 = headerMatch[2];
  } else if (!rawMime) {
    // Try to guess from filename
    const ext = (path.extname(fileName || '') || '').toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg') rawMime = 'image/jpeg';
    else if (ext === '.png') rawMime = 'image/png';
    else if (ext === '.webp') rawMime = 'image/webp';
    else rawMime = 'image/jpeg'; // fallback
  }

  if (!ALLOWED_MIME_TYPES.includes(rawMime)) {
    return {
      valid: false,
      error: `Unsupported image format (${rawMime}). Allowed formats: JPEG, PNG, WebP.`
    };
  }

  let buffer;
  try {
    buffer = Buffer.from(cleanBase64, 'base64');
  } catch (err) {
    return { valid: false, error: 'Failed to decode base64 image data.' };
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `Image exceeds maximum allowed size of 10MB (${(buffer.length / (1024 * 1024)).toFixed(2)}MB).`
    };
  }

  if (buffer.length < MIN_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'Image file is too small or corrupted.'
    };
  }

  const hash = computeImageHash(buffer);

  return {
    valid: true,
    buffer,
    cleanBase64,
    mimeType: rawMime,
    fileSize: buffer.length,
    hash
  };
}

/**
 * Validates whether Before and After images are identical duplicates
 */
function checkDuplicateImages(beforeHash, afterHash) {
  if (!beforeHash || !afterHash) return false;
  return beforeHash === afterHash;
}

const axios = require('axios');

/**
 * Optimizes an image buffer or URL for Gemini vision token efficiency
 * Returns base64 and mimeType for Gemini inlineData
 */
async function prepareImageForVision(bufferOrBase64, mimeType = 'image/jpeg') {
  let cleanBase64 = '';

  if (Buffer.isBuffer(bufferOrBase64)) {
    cleanBase64 = bufferOrBase64.toString('base64');
  } else if (typeof bufferOrBase64 === 'string') {
    if (bufferOrBase64.startsWith('http://') || bufferOrBase64.startsWith('https://')) {
      try {
        let fetchUrl = bufferOrBase64;
        // Inject Cloudinary token & size optimization parameters for fast downloading
        if (fetchUrl.includes('cloudinary.com') && fetchUrl.includes('/upload/') && !fetchUrl.includes('w_800')) {
          fetchUrl = fetchUrl.replace('/upload/', '/upload/w_800,h_800,c_limit,q_auto,f_jpg/');
        }

        const resp = await axios.get(fetchUrl, {
          responseType: 'arraybuffer',
          timeout: 6000
        });
        const buf = Buffer.from(resp.data);
        cleanBase64 = buf.toString('base64');
      } catch (err) {
        console.warn('Failed to fetch optimized remote image, attempting fallback:', bufferOrBase64, err.message);
        try {
          const resp = await axios.get(bufferOrBase64, { responseType: 'arraybuffer', timeout: 6000 });
          cleanBase64 = Buffer.from(resp.data).toString('base64');
        } catch (fbErr) {
          cleanBase64 = bufferOrBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
        }
      }
    } else {
      cleanBase64 = bufferOrBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
    }
  }

  return {
    inlineData: {
      data: cleanBase64,
      mimeType: mimeType || 'image/jpeg'
    }
  };
}

module.exports = {
  validateImagePayload,
  computeImageHash,
  checkDuplicateImages,
  prepareImageForVision,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES
};
