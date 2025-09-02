# Newspaper Subscription Workflow System

A node-based workflow automation tool for managing newspaper subscriptions, built with React and NestJS. Create visual workflows for subscriber management, package-specific welcome series, and automated email campaigns.

## Features

- **Visual Workflow Editor:** Drag-and-drop interface with React Flow
- **Node Types:** Subscriber, Subscription Package, and Email Action nodes for building subscription logic
- **Workflow Persistence:** Save and load workflows from PostgreSQL database
- **Auto-Execution:** Backend cron job runs workflows every minute
- **JsonLogic Integration:** Decoupled business logic from visual representation

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

