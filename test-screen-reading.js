const { screenOCRService } = require('./src/main/services/ScreenOCRService');

async function testScreenReading() {
  console.log('🧪 Testing Screen Reading Functionality...');
  
  try {
    // Initialize the service
    console.log('🔄 Initializing Screen OCR Service...');
    await screenOCRService.initialize();
    console.log('✅ Service initialized successfully');
    
    // Test a single capture
    console.log('📸 Taking a screenshot and extracting text...');
    const text = await screenOCRService.forceCapture();
    
    if (text && text.trim()) {
      console.log('✅ Screen reading is working!');
      console.log('📖 Extracted text:');
      console.log('---');
      console.log(text.substring(0, 500) + (text.length > 500 ? '...' : ''));
      console.log('---');
      console.log(`Total characters: ${text.length}`);
    } else {
      console.log('⚠️ No text was extracted. This might be normal if the screen is empty or contains only images.');
    }
    
    // Test continuous monitoring
    console.log('🔄 Starting continuous monitoring for 10 seconds...');
    screenOCRService.onTextChange((newText) => {
      console.log('📖 Text changed:', newText.substring(0, 100) + (newText.length > 100 ? '...' : ''));
    });
    
    screenOCRService.start();
    
    // Stop after 10 seconds
    setTimeout(async () => {
      console.log('⏹️ Stopping monitoring...');
      screenOCRService.stop();
      await screenOCRService.terminate();
      console.log('✅ Test completed successfully');
      process.exit(0);
    }, 10000);
    
  } catch (error) {
    console.error('❌ Error during screen reading test:', error);
    process.exit(1);
  }
}

// Run the test
testScreenReading(); 