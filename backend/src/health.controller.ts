import { Controller, Get } from '@nestjs/common';
import { WorkflowExecutionEngine } from './workflow/execution/workflow-execution-engine';
import { DummyDataService } from './services/dummy-data.service';
import { EmailService } from './services/email.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly workflowEngine: WorkflowExecutionEngine,
    private readonly dummyDataService: DummyDataService,
    private readonly emailService: EmailService,
  ) {}

  @Get()
  async getHealth() {
    try {
      // Get basic system stats
      const dataStats = await this.dummyDataService.getAllData();
      const emailStats = await this.emailService.getEmailStats();

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services: {
          database: 'connected',
          email: 'ready',
          workflow: 'running'
        },
        stats: {
          ...dataStats,
          emails: emailStats
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
        services: {
          database: 'error',
          email: 'error',
          workflow: 'error'
        }
      };
    }
  }

  @Get('ready')
  async getReadiness() {
    try {
      // Check if all services are ready
      await this.dummyDataService.getAllData();

      return {
        status: 'ready',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  @Get('live')
  getLiveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString()
    };
  }
}
