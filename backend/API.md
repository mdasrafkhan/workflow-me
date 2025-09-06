# Workflow Engine API Documentation

This document describes the REST API endpoints for the Workflow Execution Engine.

## Base URL
- Development: `http://localhost:4000`
- Production: `https://your-domain.com`

## Authentication
Currently, no authentication is required. In production, implement proper authentication.

## Endpoints

### Health & Status

#### GET /health
Get system health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "development",
  "services": {
    "database": "connected",
    "email": "ready",
    "workflow": "running"
  },
  "stats": {
    "users": 5,
    "subscriptionTypes": 4,
    "subscriptions": 10,
    "newsletters": 8,
    "emails": {
      "total": 15,
      "sent": 12,
      "failed": 3,
      "byTemplate": {
        "united_welcome": 5,
        "podcast_welcome": 3,
        "generic_welcome": 4
      }
    }
  }
}
```

#### GET /health/ready
Check if system is ready to accept requests.

#### GET /health/live
Check if system is alive (liveness probe).

### Workflow Execution

#### GET /workflow/executions
Get all workflow executions.

**Query Parameters:**
- `limit` (optional): Number of executions to return (default: 100)

**Response:**
```json
[
  {
    "id": "exec-123",
    "executionId": "sub_456_1234567890",
    "workflowId": "segmented-welcome-flow",
    "triggerType": "subscription_created",
    "triggerId": "456",
    "userId": "user-789",
    "status": "completed",
    "currentStep": "end",
    "state": {
      "currentState": "completed",
      "context": {
        "product": "united",
        "userEmail": "user@example.com"
      },
      "history": [...]
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "completedAt": "2024-01-01T00:05:00.000Z"
  }
]
```

#### GET /workflow/executions/:executionId
Get specific workflow execution status.

**Response:**
```json
{
  "id": "exec-123",
  "executionId": "sub_456_1234567890",
  "status": "running",
  "currentStep": "action_united_email",
  "state": {...}
}
```

#### POST /workflow/trigger/subscription
Manually trigger a subscription workflow.

**Request Body:**
```json
{
  "subscriptionId": "sub-123"
}
```

**Response:**
```json
{
  "message": "Workflow triggered successfully",
  "executionId": "sub_123_1234567890"
}
```

### Subscription Triggers

#### GET /workflow/triggers/subscriptions
Get unprocessed subscription triggers.

**Query Parameters:**
- `secondsAgo` (optional): Look back time in seconds (default: 30)

**Response:**
```json
[
  {
    "id": "sub-123",
    "userId": "user-456",
    "triggerType": "subscription_created",
    "data": {
      "subscriptionId": "sub-123",
      "product": "united",
      "status": "active",
      "amount": 9.99,
      "currency": "USD",
      "user": {
        "id": "user-456",
        "email": "user@example.com",
        "name": "John Doe"
      },
      "subscriptionType": {
        "id": "type-789",
        "name": "united_basic",
        "displayName": "United Basic"
      }
    },
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### GET /workflow/triggers/subscriptions/statistics
Get subscription trigger statistics.

**Response:**
```json
{
  "total": 100,
  "processed": 85,
  "pending": 15,
  "byProduct": {
    "united": 40,
    "podcast": 30,
    "premium": 20,
    "unknown": 10
  },
  "byStatus": {
    "active": 95,
    "cancelled": 5
  }
}
```

#### POST /workflow/triggers/subscriptions/create
Create a new subscription (for testing).

**Request Body:**
```json
{
  "userId": "user-123",
  "product": "united",
  "subscriptionTypeId": "type-456"
}
```

**Response:**
```json
{
  "id": "sub-789",
  "userId": "user-123",
  "product": "united",
  "status": "active",
  "workflowProcessed": false,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### GET /workflow/triggers/subscriptions/:subscriptionId
Get specific subscription details.

### Newsletter Triggers

#### GET /workflow/triggers/newsletters
Get unprocessed newsletter triggers.

**Query Parameters:**
- `secondsAgo` (optional): Look back time in seconds (default: 30)

**Response:**
```json
[
  {
    "id": "news-123",
    "userId": "user-456",
    "triggerType": "newsletter_subscribed",
    "data": {
      "newsletterId": "news-123",
      "email": "user@example.com",
      "status": "subscribed",
      "source": "website",
      "preferences": {
        "frequency": "weekly",
        "categories": ["technology", "business"],
        "language": "en"
      }
    },
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### GET /workflow/triggers/newsletters/statistics
Get newsletter trigger statistics.

**Response:**
```json
{
  "total": 50,
  "processed": 45,
  "pending": 5,
  "byStatus": {
    "subscribed": 48,
    "unsubscribed": 2
  },
  "bySource": {
    "website": 30,
    "social": 15,
    "referral": 5
  },
  "byFrequency": {
    "weekly": 35,
    "daily": 10,
    "monthly": 5
  }
}
```

#### POST /workflow/triggers/newsletters/create
Create a new newsletter subscription (for testing).

**Request Body:**
```json
{
  "email": "user@example.com",
  "source": "website",
  "preferences": {
    "frequency": "weekly",
    "categories": ["technology"],
    "language": "en"
  }
}
```

#### POST /workflow/triggers/newsletters/:newsletterId/unsubscribe
Unsubscribe a newsletter.

### Shared Flows

#### GET /workflow/shared-flows
Get available shared flows.

**Response:**
```json
[
  "Welcome Follow-up Flow",
  "Engagement Nudge Flow",
  "Value Highlight Flow",
  "Newsletter Welcome Flow"
]
```

#### GET /workflow/shared-flows/statistics
Get shared flow execution statistics.

**Response:**
```json
{
  "totalExecutions": 100,
  "sharedFlowsExecuted": 250,
  "byFlowName": {
    "Welcome Follow-up Flow": 100,
    "Engagement Nudge Flow": 75,
    "Value Highlight Flow": 50,
    "Newsletter Welcome Flow": 25
  },
  "averageStepsPerFlow": 4.2
}
```

#### GET /workflow/shared-flows/:executionId/history
Get shared flow execution history for a specific execution.

#### POST /workflow/shared-flows/validate
Validate a shared flow configuration.

**Request Body:**
```json
{
  "flowName": "Welcome Follow-up Flow"
}
```

**Response:**
```json
{
  "valid": true,
  "flowName": "Welcome Follow-up Flow"
}
```

### Actions

#### GET /workflow/actions/types
Get available action types.

**Response:**
```json
[
  "send_email",
  "send_sms",
  "trigger_webhook",
  "execute_shared_flow",
  "update_user_preferences",
  "create_user_dashboard",
  "schedule_follow_up",
  "log_activity"
]
```

#### GET /workflow/actions/statistics
Get action execution statistics.

#### POST /workflow/actions/validate
Validate an action configuration.

**Request Body:**
```json
{
  "actionType": "send_email",
  "actionData": {
    "subject": "Welcome!",
    "templateId": "welcome_template"
  }
}
```

**Response:**
```json
{
  "valid": true,
  "actionType": "send_email"
}
```

### Email

#### GET /workflow/emails/statistics
Get email statistics.

**Query Parameters:**
- `executionId` (optional): Filter by execution ID

**Response:**
```json
{
  "total": 100,
  "sent": 95,
  "failed": 5,
  "byTemplate": {
    "united_welcome": 40,
    "podcast_welcome": 30,
    "generic_welcome": 25
  }
}
```

#### GET /workflow/emails/:executionId
Get emails for a specific execution.

**Response:**
```json
[
  {
    "id": "email-123",
    "executionId": "exec-456",
    "stepId": "action_united_email",
    "to": "user@example.com",
    "subject": "Welcome to United! 🪅",
    "templateId": "united_welcome",
    "status": "sent",
    "sentAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### Testing

#### POST /workflow/test/subscription
Test subscription workflow.

**Request Body:**
```json
{
  "product": "united",
  "userEmail": "test@example.com",
  "userName": "Test User"
}
```

**Response:**
```json
{
  "message": "Test subscription workflow triggered",
  "subscriptionId": "sub-123",
  "product": "united"
}
```

#### POST /workflow/test/newsletter
Test newsletter workflow.

**Request Body:**
```json
{
  "email": "test@example.com",
  "source": "website"
}
```

**Response:**
```json
{
  "message": "Test newsletter workflow triggered",
  "newsletterId": "news-123",
  "email": "test@example.com"
}
```

### Batch Processing

#### POST /workflow/process/batch
Manually trigger batch processing.

**Response:**
```json
{
  "message": "Batch processing completed"
}
```

#### POST /workflow/process/delayed
Process delayed executions.

**Response:**
```json
{
  "message": "Delayed executions processed"
}
```

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/workflow/executions"
}
```

## Rate Limiting

- API calls are rate limited to 100 requests per minute per IP
- Health check endpoints are not rate limited
- Test endpoints are rate limited to 10 requests per minute per IP

## Examples

### Complete Workflow Test

1. **Create a subscription:**
```bash
curl -X POST http://localhost:4000/workflow/triggers/subscriptions/create \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-123", "product": "united"}'
```

2. **Check execution status:**
```bash
curl http://localhost:4000/workflow/executions
```

3. **View email logs:**
```bash
curl http://localhost:4000/workflow/emails/statistics
```

### Newsletter Workflow Test

1. **Create newsletter subscription:**
```bash
curl -X POST http://localhost:4000/workflow/triggers/newsletters/create \
  -H "Content-Type: application/json" \
  -d '{"email": "newsletter@example.com", "source": "website"}'
```

2. **Check newsletter statistics:**
```bash
curl http://localhost:4000/workflow/triggers/newsletters/statistics
```

## Webhooks

The system can trigger webhooks for workflow events. Configure webhook URLs in the action data:

```json
{
  "actionType": "trigger_webhook",
  "actionData": {
    "url": "https://your-app.com/webhook",
    "method": "POST",
    "headers": {
      "Authorization": "Bearer your-token"
    },
    "data": {
      "event": "workflow_completed",
      "executionId": "exec-123"
    }
  }
}
```

## Monitoring

Use the health endpoints for monitoring:

- **Liveness**: `GET /health/live`
- **Readiness**: `GET /health/ready`
- **Full Status**: `GET /health`

## Development

For development, use the test endpoints to create sample data and trigger workflows without affecting production data.
