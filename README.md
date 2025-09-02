# Workflow Automation Application

A node-based workflow automation tool built with React and NestJS, similar to n8n. Create visual workflows by dragging and connecting nodes, then execute them automatically via backend cron jobs.

## Features

- **Visual Workflow Editor:** Drag-and-drop interface with React Flow
- **Node Types:** Subscriber, Operator, and Action nodes for building logic
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
3. **Configure Logic:** Click nodes to set properties and actions
4. **Save & Load:** Use the dropdown to save and load workflows
5. **Auto-Execution:** Backend automatically runs saved workflows every minute

## Technologies

- **Frontend:** React, React Flow, JsonLogic
- **Backend:** NestJS, TypeORM, PostgreSQL
- **Infrastructure:** Docker, Docker Compose
