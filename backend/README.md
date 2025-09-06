# Workflow Execution Engine

A robust, state-machine-based workflow execution system built with NestJS, TypeORM, and XState. This system processes subscription and newsletter workflows with real-time batch processing, delay handling, and comprehensive error recovery.

## 🏗️ Architecture

### Core Components

1. **State Machine Framework** - XState-based workflow execution
2. **Batch Processing** - 30-second interval processing
3. **Delay Management** - Handles time-based workflow steps
4. **Email Service** - Template-based email sending with logging
5. **Database Layer** - PostgreSQL with UTC timestamps
6. **Error Handling** - Comprehensive retry and failure management

### Database Schema

- **dummy_users** - Test user data
- **dummy_subscriptions** - Subscription records
- **dummy_subscription_types** - Subscription type definitions
- **dummy_newsletters** - Newsletter subscriptions
- **workflow_executions** - Workflow execution tracking
- **workflow_delays** - Delay scheduling and management
- **email_logs** - Email sending audit trail

## 🚀 Features

### Workflow Types

1. **Segmented Welcome Flow**
   - Product-specific branching (United, Podcast, Generic)
   - Welcome emails based on product type
   - Shared follow-up sequence
   - 2-day and 5-day delays between steps

2. **Newsletter Welcome Flow**
   - Simple newsletter subscription workflow
   - Welcome email with preferences

### State Management

- **Real-time state tracking** for each workflow execution
- **Step-by-step history** with timestamps and results
- **Error logging** with retry mechanisms
- **Delay scheduling** with automatic resumption

### Email System

- **Template-based emails** with Handlebars
- **Mock mode** for development and testing
- **SMTP integration** for production
- **Comprehensive logging** of all email activities

## 📦 Installation

```bash
# Install dependencies
npm install

# Copy environment configuration
cp env.example .env

# Configure database settings in .env
# Set up PostgreSQL database

# Run migrations (auto-sync in development)
npm run start:dev
```

## 🧪 Testing

### Integration Tests

```bash
# Run all tests
npm test

# Run workflow-specific tests
npm run test:workflow

# Run with coverage
npm run test:cov
```

### Manual Testing

```bash
# Run test runner script
npm run test:runner

# Or run directly
npx ts-node src/test-runner.ts
```

## 🔧 Configuration

### Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=workflow_user
DB_PASSWORD=workflow_password
DB_NAME=workflow_db

# Email
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_password
FROM_EMAIL=noreply@example.com

# Application
NODE_ENV=development
PORT=4000
```

## 📊 Usage

### Starting the Engine

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

### Workflow Execution

The engine automatically:

1. **Fetches new subscriptions** every 30 seconds
2. **Determines appropriate workflow** based on product type
3. **Executes workflow steps** with state machine
4. **Schedules delays** for time-based steps
5. **Sends emails** with proper templates
6. **Logs all activities** for monitoring

### Monitoring

- **Execution status** - Track workflow progress
- **Email logs** - Monitor email delivery
- **Delay status** - Check scheduled delays
- **Error tracking** - Identify and resolve issues

## 🏛️ State Machine

### Workflow States

- **idle** - Initial state
- **running** - Executing steps
- **stepCompleted** - Step finished successfully
- **stepFailed** - Step failed, retrying
- **retrying** - Waiting before retry
- **delayed** - Waiting for delay period
- **completed** - Workflow finished
- **failed** - Workflow failed after retries
- **cancelled** - Workflow cancelled

### State Transitions

```
idle → running → stepCompleted → running → completed
  ↓       ↓           ↓
cancelled stepFailed → retrying → running
  ↓           ↓
cancelled   failed
```

## 🔄 Batch Processing

### Processing Cycle

1. **Every 30 seconds** - Fetch new trigger data
2. **Subscription processing** - Handle new subscriptions
3. **Newsletter processing** - Handle new newsletter subscriptions
4. **Delay processing** - Execute ready delayed steps
5. **Error handling** - Retry failed executions

### Idempotency

- **Unique execution IDs** prevent duplicate processing
- **Processed flags** mark completed items
- **Retry mechanisms** handle temporary failures
- **State persistence** survives server restarts

## 📧 Email System

### Templates

- **united_welcome** - United subscription welcome
- **podcast_welcome** - Podcast subscription welcome
- **generic_welcome** - Generic subscription welcome
- **engagement_nudge** - Follow-up engagement email
- **value_highlight** - Value proposition email
- **newsletter_welcome** - Newsletter subscription welcome

### Email Logging

All emails are logged with:
- **Recipient and subject**
- **Template used**
- **Data sent**
- **Delivery status**
- **Error messages** (if any)

## 🛠️ Development

### Adding New Workflow Types

1. **Create workflow definition** in `getWorkflowDefinition()`
2. **Add trigger logic** in `determineWorkflowId()`
3. **Implement action handlers** in `executeAction()`
4. **Add email templates** if needed
5. **Update tests** to cover new workflow

### Adding New Action Types

1. **Create action executor** class
2. **Implement `execute()` method**
3. **Register in workflow engine**
4. **Add to workflow definitions**
5. **Update tests**

### Adding New Trigger Types

1. **Create trigger retriever** class
2. **Implement data fetching logic**
3. **Add to batch processing**
4. **Create test data**
5. **Update tests**

## 🚨 Error Handling

### Failure Scenarios

1. **Email sending failures** - Logged and retried
2. **Database connection issues** - Graceful degradation
3. **Invalid workflow definitions** - Validation errors
4. **State machine errors** - Automatic recovery
5. **Server restarts** - State persistence

### Recovery Mechanisms

- **Automatic retries** with exponential backoff
- **Dead letter queues** for failed items
- **State persistence** across restarts
- **Comprehensive logging** for debugging
- **Health checks** for monitoring

## 📈 Monitoring

### Key Metrics

- **Execution count** - Total workflows processed
- **Success rate** - Percentage of successful executions
- **Email delivery** - Email sending statistics
- **Delay processing** - Delayed execution metrics
- **Error rates** - Failure tracking

### Logging

- **Structured logging** with context
- **Performance metrics** for optimization
- **Error tracking** with stack traces
- **Audit trails** for compliance
- **Real-time monitoring** capabilities

## 🔒 Security

### Data Protection

- **UTC timestamps** for consistency
- **Input validation** on all data
- **SQL injection prevention** with TypeORM
- **Email sanitization** for security
- **Error message sanitization**

### Access Control

- **Environment-based configuration**
- **Database connection security**
- **SMTP authentication**
- **API endpoint protection**
- **Audit logging** for compliance

## 🚀 Production Deployment

### Prerequisites

- **PostgreSQL database** with proper configuration
- **SMTP server** for email delivery
- **Redis** (optional, for future queue implementation)
- **Monitoring system** for health checks

### Deployment Steps

1. **Configure environment** variables
2. **Set up database** with proper permissions
3. **Configure SMTP** for email delivery
4. **Deploy application** with process manager
5. **Set up monitoring** and alerting
6. **Run health checks** and tests

### Performance Considerations

- **Database indexing** for efficient queries
- **Connection pooling** for database access
- **Email rate limiting** to prevent spam
- **Memory management** for state machines
- **Batch size optimization** for processing

## 📚 API Reference

### WorkflowExecutionEngine

- `processBatchWorkflows()` - Main batch processing
- `processDelayedExecutions()` - Handle delayed steps
- `executeSubscriptionWorkflow()` - Process subscription
- `executeNewsletterWorkflow()` - Process newsletter
- `triggerWorkflowForSubscription()` - Manual trigger
- `getExecutionStatus()` - Get execution status
- `getAllExecutions()` - List all executions

### DummyDataService

- `initializeDummyData()` - Set up test data
- `createSubscription()` - Create test subscription
- `createNewsletterSubscription()` - Create test newsletter
- `getUnprocessedSubscriptions()` - Get new subscriptions
- `getUnprocessedNewsletters()` - Get new newsletters
- `markSubscriptionProcessed()` - Mark as processed
- `markNewsletterProcessed()` - Mark as processed

### EmailService

- `sendEmail()` - Send email with template
- `getEmailStats()` - Get email statistics
- `getEmailsForExecution()` - Get execution emails

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch**
3. **Add tests** for new functionality
4. **Ensure all tests pass**
5. **Submit pull request**

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:

1. **Check the logs** for error details
2. **Review the documentation** for configuration
3. **Run the test suite** to verify setup
4. **Check database connectivity** and permissions
5. **Verify email configuration** and SMTP settings

## 🔮 Future Enhancements

- **Queue system** with Redis/Bull
- **Real-time monitoring** dashboard
- **Workflow visualization** tools
- **Advanced retry strategies**
- **Multi-tenant support**
- **API endpoints** for external triggers
- **Webhook integrations**
- **Advanced email templates**
- **Performance optimization**
- **Horizontal scaling**
