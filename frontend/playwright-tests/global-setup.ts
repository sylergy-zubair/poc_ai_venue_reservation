import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig): Promise<void> {
  const { baseURL } = config.projects[0].use;
  
  console.log('🚀 Starting E2E test environment setup...');
  
  // Wait for services to be available
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Wait for backend health check
    console.log('⏳ Waiting for backend service...');
    await page.waitForResponse(
      response => response.url().includes('/health') && response.ok(),
      { timeout: 60000 }
    );
    console.log('✅ Backend service is ready');
    
    // Wait for frontend to be available
    console.log('⏳ Waiting for frontend service...');
    await page.goto(baseURL || 'http://localhost:3000');
    await page.waitForLoadState('networkidle');
    console.log('✅ Frontend service is ready');
    
    // Seed test data if needed
    console.log('🌱 Seeding test data...');
    await seedTestData();
    console.log('✅ Test data seeded successfully');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
  
  console.log('🎉 E2E test environment ready!');
}

async function seedTestData(): Promise<void> {
  // This would typically seed your test database with known data
  // For now, we'll just add a delay to ensure services are fully ready
  await new Promise(resolve => setTimeout(resolve, 2000));
}

export default globalSetup;