import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowTriggerRegistryService } from './workflow-trigger-registry.service';
import { SubscriptionTriggerService } from '../../services/subscription-trigger.service';
import { UserTriggerService } from '../../services/user-trigger.service';
import { NewsletterTriggerService } from '../../services/newsletter-trigger.service';
import { DummySubscription } from '../../database/entities/dummy-subscription.entity';
import { DummyUser } from '../../database/entities/dummy-user.entity';
import { DummySubscriptionType } from '../../database/entities/dummy-subscription-type.entity';
import { DummyNewsletter } from '../../database/entities/dummy-newsletter.entity';
import { WorkflowExecutionSchedule } from '../../database/entities/workflow-execution-schedule.entity';
import { VisualWorkflow } from '../visual-workflow.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DummySubscription,
      DummyUser,
      DummySubscriptionType,
      DummyNewsletter,
      WorkflowExecutionSchedule,
      VisualWorkflow
    ])
  ],
  providers: [
    WorkflowTriggerRegistryService,
    SubscriptionTriggerService,
    UserTriggerService,
    NewsletterTriggerService,
    {
      provide: 'TRIGGER_INITIALIZER',
      useFactory: (
        registry: WorkflowTriggerRegistryService,
        subscriptionTrigger: SubscriptionTriggerService,
        userTrigger: UserTriggerService,
        newsletterTrigger: NewsletterTriggerService
      ) => {
        // Register all triggers with the registry
        registry.register(subscriptionTrigger);
        registry.register(userTrigger);
        registry.register(newsletterTrigger);

        return registry;
      },
      inject: [
        WorkflowTriggerRegistryService,
        SubscriptionTriggerService,
        UserTriggerService,
        NewsletterTriggerService
      ]
    }
  ],
  exports: [
    WorkflowTriggerRegistryService,
    SubscriptionTriggerService,
    UserTriggerService,
    NewsletterTriggerService
  ]
})
export class WorkflowTriggerModule {}
