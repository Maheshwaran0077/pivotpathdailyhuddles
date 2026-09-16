const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '../uploads/evidence');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Computes SHA-256 hash of buffer/base64 data
 */
function computeHash(data) {
  const buf = Buffer.isBuffer(data)
    ? data
    : Buffer.from(data.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * Uploads evidence photo either to Cloudinary (if credentials exist) or local disk.
 * Always returns a standardized Cloudinary-compatible metadata object.
 */
async function uploadEvidenceImage({ fileData, fileName, mimeType = 'image/jpeg', uploadedBy = 'User', imageType = 'evidence' }) {
  if (!fileData) {
    throw new Error('Image file data is required.');
  }

  // 1. Prepare buffer
  let buffer;
  if (Buffer.isBuffer(fileData)) {
    buffer = fileData;
  } else if (typeof fileData === 'string' && fileData.startsWith('data:')) {
    const base64Str = fileData.replace(/^data:image\/\w+;base64,/, '');
    buffer = Buffer.from(base64Str, 'base64');
  } else if (typeof fileData === 'string') {
    buffer = Buffer.from(fileData, 'base64');
  } else {
    throw new Error('Unsupported image file data format.');
  }

  const hash = computeHash(buffer);
  let cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  let apiKey = process.env.CLOUDINARY_API_KEY;
  let apiSecret = process.env.CLOUDINARY_API_SECRET;

  if ((!cloudName || !apiKey || !apiSecret) && process.env.CLOUDINARY_URL) {
    try {
      const match = process.env.CLOUDINARY_URL.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);
      if (match) {
        apiKey = match[1];
        apiSecret = match[2];
        cloudName = match[3];
      }
    } catch (e) {
      console.warn('Failed to parse CLOUDINARY_URL:', e.message);
    }
  }

  // 2. If Cloudinary credentials configured, upload to Cloudinary API
  if (cloudName && apiKey && apiSecret) {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const publicId = `dailyhuddles_${imageType}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const folder = 'daily_huddles_evidence';

      const signatureStr = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
      const signature = crypto.createHash('sha1').update(signatureStr).digest('hex');

      const formData = new URLSearchParams();
      formData.append('file', `data:${mimeType};base64,${buffer.toString('base64')}`);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp);
      formData.append('public_id', publicId);
      formData.append('folder', folder);
      formData.append('signature', signature);

      const cloudRes = await axios.post(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, formData.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      if (cloudRes.data && cloudRes.data.secure_url) {
        return {
          secure_url: cloudRes.data.secure_url,
          url: cloudRes.data.secure_url,
          public_id: cloudRes.data.public_id,
          format: cloudRes.data.format || mimeType.split('/')[1] || 'jpg',
          width: cloudRes.data.width || 800,
          height: cloudRes.data.height || 600,
          bytes: cloudRes.data.bytes || buffer.length,
          fileSize: cloudRes.data.bytes || buffer.length,
          mimeType,
          hash,
          uploadedAt: new Date(),
          uploadedBy
        };
      }
    } catch (cloudErr) {
      console.warn('Cloudinary upload warning (falling back to local storage):', cloudErr.response?.data || cloudErr.message);
    }
  }

  // 3. Fallback to local storage (serves identical Cloudinary-compatible metadata structure)
  const ext = mimeType === 'image/png' ? '.png' : mimeType === 'image/webp' ? '.webp' : '.jpg';
  const cleanName = (fileName || `${imageType}-evidence`).replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeFileName = `${Date.now()}-${imageType}-${cleanName}${ext}`;
  const filePath = path.join(UPLOAD_DIR, safeFileName);

  fs.writeFileSync(filePath, buffer);
  const localUrl = `/uploads/evidence/${safeFileName}`;

  return {
    secure_url: localUrl,
    url: localUrl,
    public_id: safeFileName,
    format: ext.replace('.', ''),
    width: 800,
    height: 600,
    bytes: buffer.length,
    fileSize: buffer.length,
    mimeType,
    hash,
    uploadedAt: new Date(),
    uploadedBy
  };
}

module.exports = {
  uploadEvidenceImage,
  computeHash
};
