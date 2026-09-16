const { prepareImageForVision } = require('../services/imageValidationService');

async function testRemoteParsing() {
  console.log('Testing remote Cloudinary URL conversion to Base64 byte string...');
  const remoteUrl = 'https://res.cloudinary.com/blikqx3l/image/upload/v1788469802/daily_huddles_evidence/dailyhuddles_before_1788469799648_oxdt.png';
  
  try {
    const part = await prepareImageForVision(remoteUrl, 'image/png');
    console.log('MimeType:', part.inlineData.mimeType);
    console.log('Base64 Length:', part.inlineData.data.length);
    console.log('Base64 Preview:', part.inlineData.data.slice(0, 50));
    
    if (part.inlineData.data && !part.inlineData.data.startsWith('http') && part.inlineData.data.length > 100) {
      console.log('✅ TEST PASSED: Cloudinary URL successfully converted to raw Base64 bytes for Gemini API.');
    } else {
      console.error('❌ TEST FAILED: Base64 data invalid.');
    }
  } catch (err) {
    console.error('❌ TEST FAILED with error:', err.message);
  }
}

testRemoteParsing();
