# Workflow Execution Engine

A sophisticated, enterprise-grade workflow automation platform built with NestJS, TypeORM, and modern web technologies. This system provides visual workflow creation, execution orchestration, and comprehensive state management for complex business processes.

## 🏗️ Architecture

### Core Components

1. **Workflow Orchestration Engine** - Central workflow execution coordinator
2. **Node Executor System** - Plugin-based architecture with specialized executors
3. **Visual Workflow Management** - React Flow integration with JSON Logic
4. **Batch Processing** - 30-second interval processing with cron scheduling
5. **Delay Management** - Sophisticated delay and timing controls
6. **Email Service** - Template-based email sending with comprehensive logging
7. **Database Layer** - PostgreSQL with proper foreign key relationships
8. **State Management** - XState for complex state machines
9. **Error Handling** - Comprehensive retry and failure management
10. **Testing Framework** - Automated test suite with safe data management

### Core Database Schema

- **workflow** (JsonLogicRule) - Workflow definitions with JSON Logic rules
- **visual_workflow** - Visual workflow representations with React Flow data
- **workflow_executions** - Workflow execution tracking and state management
- **workflow_delays** - Delay scheduling and management
- **dummy_users** - Test user data
- **dummy_subscriptions** - Subscription records
- **dummy_subscription_types** - Subscription type definitions
- **dummy_newsletters** - Newsletter subscriptions

### External Service Data

- **email_logs** - Email sending audit trail (Email Service concern)
- **sms_logs** - SMS sending audit trail (SMS Service concern)
- **webhook_logs** - Webhook call audit trail (Webhook Service concern)

### Architectural Separation

The system follows a clean separation of concerns:

#### **Core Workflow Engine**
- Workflow orchestration and execution
- State management and persistence
- Node executor coordination
- Delay and timing management
- Visual workflow management

#### **External Services**
- **Email Service** - Handles email sending, templates, and logging
- **SMS Service** - Handles SMS notifications (future)
- **Webhook Service** - Handles external webhook calls (future)

This separation allows for:
- **Independent scaling** of each service
- **Technology flexibility** for different service needs
- **Clear boundaries** between workflow logic and business operations
- **Easier testing** and maintenance

## 🚀 Features

### Node Executor System

1. **Action Node** - Executes business actions (email, SMS, webhook)
2. **Delay Node** - Manages workflow suspension and resumption
3. **Condition Node** - Evaluates JSON Logic expressions for branching
4. **Shared Flow Node** - Executes reusable workflow components
5. **Webhook Node** - Triggers external webhook calls

### Visual Workflow Management

- **React Flow Integration** - Drag-and-drop workflow editor
- **JSON Logic Conversion** - Automatic conversion from visual to logic
- **Cascade Delete** - Proper data relationship management
- **Workflow Persistence** - Save and load workflows from database

### State Management

- **Real-time state tracking** for each workflow execution
- **Step-by-step history** with timestamps and results
- **Error logging** with retry mechanisms
- **Delay scheduling** with automatic resumption
- **XState Integration** - Complex state machine management

### Email System

- **Template-based emails** with Handlebars
- **Mock mode** for development and testing
- **SMTP integration** for production
- **Comprehensive logging** of all email activities
- **Multiple action types** - send_email, send_sms, trigger_webhook

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

### Comprehensive Test Suite

```bash
# Run all tests
npm test

# Run workflow-specific tests
npm run test:workflow

# Run with coverage
npm run test:cov

# Run comprehensive build tests
npm run test:workflow:build

# Clear test data safely
npm run test:clear

# Run test runner script
npm run test:runner
```

### Test Types

1. **Unit Tests** - Individual component testing
2. **Integration Tests** - Workflow execution testing
3. **Build Tests** - Automated workflow validation
4. **Cleanup Tests** - Safe data management

### Test Data Management

- **Test Prefix** - All test data uses `test-` prefix
- **Safe Cleanup** - Only test data is removed during cleanup
- **Isolation** - Tests don't affect production data
- **Automation** - Tests run on every build

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

### Workflow Management

- `POST /workflow/execute` - Execute workflow with context
- `GET /workflow/node-types` - Get available node types
- `GET /workflow/executions` - List all executions
- `GET /workflow/executions/:id` - Get execution details
- `POST /workflow/executions/:id/start` - Start workflow
- `POST /workflow/executions/:id/stop` - Stop workflow
- `POST /workflow/executions/:id/pause` - Pause workflow
- `POST /workflow/executions/:id/resume` - Resume workflow
- `POST /workflow/executions/:id/cancel` - Cancel workflow

### Visual Workflow Management

- `GET /workflow/visual-workflows` - List visual workflows
- `GET /workflow/visual-workflows/:id` - Get visual workflow
- `POST /workflow/visual-workflows` - Create/update visual workflow
- `POST /workflow/visual-workflows/:id/delete` - Delete visual workflow

### Trigger Management

- `GET /workflow/triggers/subscriptions` - Get subscription triggers
- `POST /workflow/triggers/subscriptions/create` - Create subscription
- `GET /workflow/triggers/newsletters` - Get newsletter triggers
- `POST /workflow/triggers/newsletters/create` - Create newsletter
- `POST /workflow/triggers/newsletters/:id/unsubscribe` - Unsubscribe

### Testing & Recovery

- `POST /workflow/test/subscription` - Test subscription workflow
- `POST /workflow/test/newsletter` - Test newsletter workflow
- `POST /workflow/process/batch` - Process batch workflows
- `POST /workflow/process/delayed` - Process delayed executions
- `POST /workflow/recovery/recover` - Recover workflows
- `GET /workflow/recovery/statistics` - Get recovery statistics

### Health & Monitoring

- `GET /health` - System health check
- `GET /health/ready` - Readiness check
- `GET /health/live` - Liveness check
- `GET /workflow/emails/statistics` - Email statistics
- `GET /workflow/emails/:executionId` - Get execution emails

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

## 🔧 Build Scripts

### Available Scripts

```bash
# Development
npm run start:dev          # Start with hot reload
npm run build              # Build for production
npm run build:dev          # Build and run tests

# Testing
npm run test               # Run all tests
npm run test:workflow      # Run workflow tests
npm run test:workflow:build # Run comprehensive build tests
npm run test:clear         # Clear test data safely
npm run test:runner        # Run test runner

# Production
npm run start:prod         # Start production server
```

### Build Test Integration

The `build:dev` script automatically:
1. **Builds** the application
2. **Runs comprehensive tests** including:
   - Workflow execution tests
   - Visual workflow tests
   - Cascade delete tests
   - Node executor tests
   - Delay processing tests
3. **Validates** all components work correctly
4. **Cleans up** test data safely

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
