const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { DummyDataService } = require('./dist/services/dummy-data.service');

async function resetDummyData() {
  console.log('🔄 Resetting dummy data...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dummyDataService = app.get(DummyDataService);

  try {
    await dummyDataService.initializeDummyData();
    console.log('✅ Dummy data reset successfully!');
  } catch (error) {
    console.error('❌ Error resetting dummy data:', error);
  } finally {
    await app.close();
  }
}

resetDummyData();
