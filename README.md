# Newspaper Subscription Workflow System

A node-based workflow automation tool for managing newspaper subscriptions, built with React and NestJS. Create visual workflows for subscriber management, package-specific welcome series, and automated email campaigns.

## Features

- **Visual Workflow Editor:** Drag-and-drop interface with React Flow
- **Node Types:** Subscriber, Subscription Package, and Email Action nodes for building subscription logic
- **Workflow Persistence:** Save and load workflows from PostgreSQL database
- **Auto-Execution:** Backend cron job runs workflows every minute
- **JsonLogic Integration:** Decoupled business logic from visual representation
- **Professional UI:** Apple-inspired design with clean, modern interface

## Quick Start

1. **Navigate to the docker directory:**
   ```bash
   cd docker
   ```

2. **Run the application:**
   ```bash
   docker-compose up --build
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000

## Usage

1. **Create Workflows:** Drag nodes from the sidebar onto the canvas
2. **Connect Nodes:** Link nodes by dragging from one handle to another
3. **Configure Logic:** Click nodes to set subscriber properties, subscription packages, and email actions
4. **Save & Load:** Use the dropdown to save and load workflows
5. **Auto-Execution:** Backend automatically runs saved workflows every minute

## Node Types

### Trigger Nodes
- **Subscription Trigger (🚀):** Initiates workflows when users buy subscriptions, renew, or cancel
- **Newsletter Trigger (📬):** Starts workflows when users sign up for newsletters or opt-in

### Condition Nodes
- **Product Condition (⚖️):** Segments users based on subscription package (Basic, Premium, Enterprise, Student, Family)
- **User Segment Condition (🎯):** Categorizes users (New, Returning, High Value, At Risk, Engaged)

### Timing Nodes
- **Delay Node (⏰):** Fixed delays (1 hour, 1 day, 2 days, 3 days, 1 week, 2 weeks)
- **Random Delay Node (🎲):** Variable delays (1-3 days, 3-5 days, 1-2 weeks, 2-4 weeks)

### Email Action Nodes
- **Welcome Email (👋):** Subscription welcome, newsletter welcome, premium/basic welcome templates
- **Newsletter Email (📧):** Weekly newsletter, daily digest, breaking news, featured content
- **Follow-up Email (🔄):** Value drop, engagement boost, re-engagement, upsell offers

### Flow Control Nodes
- **Split Node (🔀):** Branches workflow based on product, user segment, time, or behavior
- **Merge Node (🔗):** Combines multiple workflow paths (all paths, first complete, majority complete)
- **End Node (🏁):** Terminates workflow (complete, unsubscribed, max emails sent, error)

## Workflow Examples

### 1. Subscription Welcome Series
**Trigger:** User buys subscription → **Split by Product** → **Welcome Email** → **Delay** → **Follow-up Email** → **End**

### 2. Newsletter Welcome Series
**Trigger:** User signs up newsletter → **Welcome Email** → **Delay 2 days** → **Value Drop** → **Random Delay 3-5 days** → **Newsletter** → **End**

### 3. Advanced Segmentation
**Trigger:** User buys subscription → **User Segment Check** → **Split by Segment** → **Conditional Emails** → **Delays** → **Follow-ups** → **Merge** → **End**

## Technologies

- **Frontend:** React, React Flow, JsonLogic
- **Backend:** NestJS, TypeORM, PostgreSQL
- **Infrastructure:** Docker, Docker Compose
