const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const { uploadEvidenceImage } = require('../services/cloudinaryService');

async function testCloudinaryUpload() {
  console.log('\n======================================================');
  console.log('☁️ TESTING LIVE CLOUDINARY UPLOAD INTEGRATION');
  console.log('======================================================\n');
  console.log('• Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
  console.log('• API Key:', process.env.CLOUDINARY_API_KEY);

  const sampleBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  try {
    const result = await uploadEvidenceImage({
      fileData: sampleBase64,
      fileName: 'live_test_evidence.png',
      mimeType: 'image/png',
      uploadedBy: 'Test Admin',
      imageType: 'before'
    });

    console.log('\n✅ Cloudinary Upload Succeeded!');
    console.log('• Secure URL:', result.secure_url);
    console.log('• Public ID:', result.public_id);
    console.log('• Format:', result.format);
    console.log('• Width x Height:', result.width, 'x', result.height);
    console.log('• Bytes:', result.bytes);

    if (!result.secure_url || !result.secure_url.includes('cloudinary.com')) {
      throw new Error('Upload did not return a valid Cloudinary URL!');
    }

    console.log('\n🎉 CLOUDINARY SECURE STORAGE IS FULLY OPERATIONAL!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Cloudinary Upload Failed:', err);
    process.exit(1);
  }
}

testCloudinaryUpload();
