# Workflow Management System

A workflow automation platform built with React and NestJS. This system provides visual workflow creation, execution orchestration, and state management for business processes.

## 🏗️ Architecture Overview

The Workflow Management System is built on a microservices architecture with clear separation of concerns, enabling scalable and maintainable workflow automation.

### Core Components

- **Frontend**: React-based visual workflow editor with React Flow
- **Backend**: NestJS API with TypeORM and PostgreSQL
- **Scheduler**: Node-cron based job processing with per-workflow execution tracking
- **State Management**: XState for complex state machines
- **Logic Engine**: JSON Logic JS for business rule evaluation
- **Storage**: PostgreSQL for persistence, Redis for caching
- **Queue System**: Bull queue for background job processing

## 🎯 Key Features

- **Visual Workflow Editor**: Drag-and-drop interface with React Flow
- **Node-Based Architecture**: Extensible node system with custom executors
- **Real-time Execution**: Cron-based workflow processing every 30 seconds
- **Delay Management**: Sophisticated delay and timing controls
- **State Persistence**: Complete workflow state tracking and recovery
- **JSON Logic Integration**: Decoupled business logic from visual representation
- **UUID-Based Architecture**: Globally unique identifiers for data integrity
- **Cascade Delete**: Proper data relationship management
- **Comprehensive Testing**: Automated test suite with cleanup management

## 🏛️ System Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[React Frontend]
        VWE[Visual Workflow Editor]
        RF[React Flow]
    end

    subgraph "API Layer"
        API[NestJS API]
        WC[Workflow Controller]
        HC[Health Controller]
    end

    subgraph "Business Logic Layer"
        WOE[Workflow Orchestration Engine]
        NR[Node Registry]
        NE[Node Executors]
        SM[State Machine Service]
    end

    subgraph "Scheduling Layer"
        CRON[Node-Cron Scheduler]
        BQ[Bull Queue]
        DP[Delay Processor]
    end

    subgraph "Data Layer"
        PG[(PostgreSQL)]
        RD[(Redis)]
        WF[Workflow Storage]
        EX[Execution Storage]
        DL[Delay Storage]
    end

    subgraph "External Services"
        EMAIL[Email Service]
        EMAIL_LOG[(Email Logs)]
        WEBHOOK[Webhook Service]
        SMS[SMS Service]
    end

    UI --> API
    VWE --> RF
    API --> WOE
    WC --> WOE
    WOE --> NR
    NR --> NE
    WOE --> SM
    CRON --> WOE
    BQ --> DP
    DP --> WOE
    WOE --> PG
    WOE --> RD
    NE --> EMAIL
    EMAIL --> EMAIL_LOG
    NE --> WEBHOOK
    NE --> SMS

    %% Styling
    classDef frontend fill:#1e3a8a,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    classDef api fill:#7c2d12,stroke:#dc2626,stroke-width:2px,color:#ffffff
    classDef business fill:#2d5a27,stroke:#4a9d4a,stroke-width:2px,color:#ffffff
    classDef scheduling fill:#7c2d12,stroke:#dc2626,stroke-width:2px,color:#ffffff
    classDef data fill:#374151,stroke:#6b7280,stroke-width:2px,color:#ffffff
    classDef external fill:#991b1b,stroke:#ef4444,stroke-width:2px,color:#ffffff

    class UI,VWE,RF frontend
    class API,WC,HC api
    class WOE,NR,NE,SM business
    class CRON,BQ,DP scheduling
    class PG,RD,WF,EX,DL,EMAIL_LOG data
    class EMAIL,WEBHOOK,SMS external
```

### Workflow Execution Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant W as Workflow Engine
    participant N as Node Registry
    participant E as Node Executor
    participant D as Database
    participant C as Cron Scheduler

    U->>F: Create/Edit Workflow
    F->>A: Save Workflow Definition
    A->>D: Store in PostgreSQL

    U->>F: Trigger Workflow
    F->>A: Execute Workflow Request
    A->>W: Process Workflow
    W->>D: Create Execution Record

    loop For Each Step
        W->>N: Get Node Executor
        N->>E: Execute Step
        E->>D: Update State
        E->>W: Return Result

        alt Delay Node
            W->>D: Create Delay Record
            W->>W: Suspend Workflow
        end
    end

    C->>W: Process Pending Delays (Every 30s)
    W->>D: Query Delayed Executions
    W->>W: Resume Workflow

    %% Styling
    note over U,F: Frontend Layer
    note over A: API Layer
    note over W: Business Logic Layer
    note over N: Node Registry
    note over E: Node Executor
    note over C: Scheduling Layer
    note over D: Data Layer
```

### User Creation Workflow Data Flow

```mermaid
flowchart TD
    %% User Creation Workflow Execution Flow
    A[User Created in Database] --> B[Cron Scheduler Runs Every 30s]
    B --> C[Query workflow_executions_schedule]
    C --> D{Last Execution Time}
    D --> E[Query Users Created Since Last Run]
    E --> F[For Each New User]
    F --> G[Load Workflow Definition]
    G --> H[Create Workflow Execution]
    H --> I[Execute Trigger Node]
    I --> J{User Condition Check}
    J -->|Pass| K[Execute Action Node]
    J -->|Fail| L[Skip Workflow]
    K --> M[Send Email Action]
    M --> N[Execute Delay Node]
    N --> O[Create Delay Record]
    O --> P[Update Execution State]
    P --> Q[Schedule Resume]
    Q --> R[Wait for Delay Period]
    R --> S[Delay Processor Runs]
    S --> T[Resume Workflow]
    T --> U[Execute End Node]
    U --> V[Mark Execution Complete]
    V --> W[Update Schedule Time]
    W --> X[Log Completion]

    %% Error Handling
    G --> Y{Workflow Found?}
    Y -->|No| Z[Log Error & Skip]
    Y -->|Yes| H

    M --> AA{Email Sent?}
    AA -->|Success| N
    AA -->|Failed| BB[Log Error & Continue]
    BB --> N

    %% Recovery Process
    CC[System Restart] --> DD[Recovery Service]
    DD --> EE[Query Pending Executions]
    EE --> FF[Query Pending Delays]
    FF --> GG[Resume Interrupted Workflows]
    GG --> HH[Update Schedule Times]

    %% Styling
    classDef startEnd fill:#2d5a27,stroke:#4a9d4a,stroke-width:3px,color:#ffffff
    classDef process fill:#1e3a8a,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    classDef decision fill:#7c2d12,stroke:#dc2626,stroke-width:2px,color:#ffffff
    classDef error fill:#991b1b,stroke:#ef4444,stroke-width:2px,color:#ffffff
    classDef database fill:#374151,stroke:#6b7280,stroke-width:2px,color:#ffffff
    classDef recovery fill:#2d5a27,stroke:#4a9d4a,stroke-width:2px,color:#ffffff

    class A,V,X startEnd
    class B,E,F,G,H,I,K,M,N,O,P,Q,R,S,T,U,W process
    class D,J,Y,AA decision
    class Z,BB error
    class C database
    class DD,EE,FF,GG,HH recovery
```

### Database Schema

```mermaid
erDiagram
    WORKFLOW ||--o{ VISUAL_WORKFLOW : "has"
    WORKFLOW ||--o{ WORKFLOW_EXECUTION : "executes"
    WORKFLOW_EXECUTION ||--o{ WORKFLOW_DELAY : "suspends"
    WORKFLOW ||--o{ WORKFLOW_EXECUTIONS_SCHEDULE : "schedules"

    WORKFLOW {
        uuid id PK
        jsonb rule
        timestamp createdAt
        timestamp updatedAt
    }

    VISUAL_WORKFLOW {
        uuid id PK
        string name
        jsonb nodes
        jsonb edges
        uuid workflowId FK
        timestamp createdAt
        timestamp updatedAt
    }

    WORKFLOW_EXECUTION {
        uuid id PK
        string executionId UK
        uuid workflowId FK
        string status
        jsonb state
        string userId
        timestamp createdAt
        timestamp updatedAt
    }

    WORKFLOW_DELAY {
        uuid id PK
        string executionId FK
        string stepId
        string delayType
        bigint delayMs
        timestamp executeAt
        string status
        jsonb context
        jsonb result
        text error
        int retryCount
        timestamp executedAt
        timestamp createdAt
        timestamp updatedAt
    }

    WORKFLOW_EXECUTIONS_SCHEDULE {
        uuid id PK
        uuid workflowId FK
        string triggerType
        string triggerId
        timestamp lastExecutedAt
        timestamp createdAt
        timestamp updatedAt
    }

    %% Styling
    classDef core fill:#1e3a8a,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    classDef visual fill:#7c2d12,stroke:#dc2626,stroke-width:2px,color:#ffffff
    classDef execution fill:#2d5a27,stroke:#4a9d4a,stroke-width:2px,color:#ffffff
    classDef delay fill:#991b1b,stroke:#ef4444,stroke-width:2px,color:#ffffff
    classDef schedule fill:#374151,stroke:#6b7280,stroke-width:2px,color:#ffffff

    class WORKFLOW core
    class VISUAL_WORKFLOW visual
    class WORKFLOW_EXECUTION execution
    class WORKFLOW_DELAY delay
    class WORKFLOW_EXECUTIONS_SCHEDULE schedule
```

### Scheduler Architecture

The workflow system uses a sophisticated scheduling mechanism that tracks execution times per workflow:

#### Per-Workflow Execution Tracking
- **`workflow_executions_schedule`** table stores the last execution time for each workflow
- **Persistent State**: Survives system restarts and maintains execution history
- **Trigger-Specific**: Each workflow can have different trigger types (user_created, subscription_changed, etc.)
- **Incremental Processing**: Only processes new data since last execution

#### Execution Flow
1. **Cron Trigger**: Every 30 seconds, the scheduler activates
2. **Workflow Iteration**: For each active workflow, check its last execution time
3. **Data Query**: Query for new trigger data since last execution
4. **Execution**: Process each new trigger with the workflow
5. **State Update**: Update the last execution time for the workflow

#### Recovery Mechanism
- **Startup Recovery**: On system restart, recovery service resumes interrupted workflows
- **Delay Processing**: Processes any pending delays that were scheduled before restart
- **State Validation**: Ensures workflow state consistency after recovery

### External Services

The workflow system integrates with external services for business operations:

- **Email Service** - Handles email sending and logging (separate concern)
- **SMS Service** - Handles SMS notifications (future)
- **Webhook Service** - Triggers external webhooks (future)
- **Notification Service** - Centralized notification management (future)

### Separation of Concerns

The architecture follows a clean separation of concerns:

#### **Core Workflow System**
- Workflow definitions and execution
- State management and persistence
- Node executor coordination
- Delay and timing management

#### **External Services**
- Email sending and logging
- SMS notifications
- Webhook triggers
- External API integrations

This separation allows for:
- **Independent scaling** of services
- **Technology flexibility** for each service
- **Clear boundaries** between concerns
- **Easier testing** and maintenance

## 🔧 Technical Implementation


### Workflow Orchestration Engine

The core of the system is the `WorkflowOrchestrationEngine` which handles:

- **Workflow Execution**: Coordinates step-by-step workflow processing
- **State Management**: Tracks workflow state and execution history
- **Error Handling**: Comprehensive error recovery and logging
- **Cron Scheduling**: Automated workflow processing every 30 seconds
- **Delay Processing**: Manages suspended workflows and delayed execution

### Node Executor System

The system uses a plugin-based architecture with specialized node executors:

#### Available Node Types

1. **Action Node** (`action-node.executor.ts`)
   - Executes business actions (email, SMS, webhook)
   - Supports template-based content generation
   - Handles external service integration

2. **Delay Node** (`delay-node.executor.ts`)
   - Manages workflow suspension and resumption
   - Supports multiple delay types (fixed, random, custom)
   - Integrates with cron scheduler for timing

3. **Condition Node** (`condition-node.executor.ts`)
   - Evaluates JSON Logic expressions
   - Enables conditional workflow branching
   - Supports complex business rule evaluation

4. **Shared Flow Node** (`shared-flow-node.executor.ts`)
   - Executes reusable workflow components
   - Enables workflow composition and modularity
   - Supports parameter passing and result handling

5. **Webhook Node** (`webhook-node.executor.ts`)
   - Triggers external webhook calls
   - Handles HTTP request/response processing
   - Supports authentication and retry logic

### JSON Logic Integration

The system uses `json-logic-js` for business rule evaluation:

```javascript
// Example JSON Logic rule
{
  "if": [
    { ">": [{ "var": "user.subscriptionType" }, "premium"] },
    "send_premium_welcome",
    "send_standard_welcome"
  ]
}
```

### Cron-Based Processing

The system uses `@nestjs/schedule` with `node-cron` for:

- **Batch Processing**: Every 30 seconds
- **Delay Processing**: Resuming suspended workflows
- **Cleanup Tasks**: Database maintenance and cleanup
- **Health Checks**: System monitoring and alerting

### State Management with XState

Complex workflows use XState for state machine management:

```typescript
// Example state machine
const workflowMachine = createMachine({
  id: 'workflow',
  initial: 'idle',
  states: {
    idle: { on: { START: 'running' } },
    running: { on: { COMPLETE: 'completed', FAIL: 'failed' } },
    completed: { type: 'final' },
    failed: { type: 'final' }
  }
});
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- Docker & Docker Compose

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd workflow-me
   ```

2. **Navigate to docker directory:**
   ```bash
   cd docker
   ```

3. **Start the application:**
   ```bash
   docker-compose up --build
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000
   - Database: localhost:15432
   - Redis: localhost:16379
   - Adminer (DB Admin): http://localhost:8080

### Development Setup

1. **Backend Development:**
   ```bash
   cd backend
   npm install
   npm run start:dev
   ```

2. **Frontend Development:**
   ```bash
   cd frontend
   npm install
   npm start
   ```

3. **Run Tests:**
   ```bash
   # Backend tests
   cd backend
   npm run test:workflow:build

   # Clear test data
   npm run test:clear
   ```

