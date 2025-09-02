import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { WorkflowModule } from './workflow/workflow.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'postgres',
      port: 5432,
      username: 'workflow_user',
      password: 'workflow_password',
      database: 'workflow_db',
      autoLoadEntities: true,
      synchronize: true,
    }),
  ScheduleModule.forRoot(),
  WorkflowModule,
  ],
})
export class AppModule {}
