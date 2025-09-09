import { Controller, Get, Post } from '@nestjs/common';
import { TestDataCleanupService } from './test-data-cleanup.service';

@Controller('test')
export class TestController {
  constructor(
    private readonly testDataCleanupService: TestDataCleanupService,
  ) {}

  @Post('cleanup/test-data')
  async cleanupTestData() {
    // Check if cleanup is safe for this environment
    if (!this.testDataCleanupService.isCleanupSafe()) {
      return {
        success: false,
        message: 'Test data cleanup is not safe in this environment. Set ENABLE_TEST_CLEANUP=true or run in test/development mode.',
        environment: process.env.NODE_ENV
      };
    }

    const result = await this.testDataCleanupService.cleanupTestData();
    return {
      success: true,
      message: 'Test data cleanup completed',
      ...result
    };
  }

  @Get('cleanup/test-data/stats')
  async getTestDataStats() {
    const stats = await this.testDataCleanupService.getTestDataStats();
    return {
      success: true,
      message: 'Test data statistics retrieved',
      ...stats
    };
  }
}
