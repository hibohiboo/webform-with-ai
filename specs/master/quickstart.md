# Quickstart: アプリ感想収集フォーム

**Date**: 2026-01-28 | **Plan**: [plan.md](./plan.md)

## Prerequisites

- Node.js 20.x
- Bun (package manager and test runner)
- AWS CLI configured with valid credentials
- AWS CDK CLI (`npm install -g aws-cdk`)

## Project Setup

```bash
# From repository root
cd infrastructure && bun install
cd ../backend && bun install
cd ../frontend && bun install
cd ../e2e && bun install
```

## Local Development

### Backend (Lambda handlers)

```bash
cd backend

# Run unit tests (TDD: write tests first)
bun run test

# Run lint and type check
bun run lint
```

### Frontend (React SPA)

```bash
cd frontend

# Start dev server (Vite)
bun run dev

# Run tests
bun run test

# Run lint and type check
bun run lint

# Build for production
bun run build
```

### E2E Tests (Playwright)

```bash
cd e2e

# Run BDD scenarios
bun run test

# Run with UI mode
bun run test:ui
```

## Deploy to AWS

```bash
cd infrastructure

# Synthesize CloudFormation template
bun run cdk synth

# Deploy stack
bun run cdk deploy

# Destroy stack (cleanup)
bun run cdk destroy
```

## Architecture Overview

```
Browser → CloudFront
           ├── /* → S3 (React SPA)
           └── /api/* → API Gateway → Lambda → DynamoDB
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/{appId}` | Get app info (validates app exists) |
| POST | `/api/{appId}/responses` | Submit feedback response |
| GET | `/api/responses/csv` | Download all responses as CSV |

## Key Files

| File | Purpose |
|------|---------|
| `infrastructure/lib/webform-stack.ts` | CDK stack (all AWS resources) |
| `backend/src/lib/apps-config.ts` | App registry (add apps here) |
| `frontend/src/lib/form-definition.ts` | SurveyJS form JSON (add fields here) |
| `frontend/src/lib/i18n.ts` | Japanese/English translations |

## Adding a New App

Edit `backend/src/lib/apps-config.ts`:

```typescript
export const apps = {
  "app1": { name: "アプリ1", nameEn: "App 1" },
  "app2": { name: "アプリ2", nameEn: "App 2" },
  // Add new app here:
  "app3": { name: "新しいアプリ", nameEn: "New App" },
};
```

Then redeploy the backend Lambda.

## Adding a New Form Field

1. Update SurveyJS form definition in `frontend/src/lib/form-definition.ts`
2. No backend changes needed (accepts any fields)
3. No database migration needed (DynamoDB is schemaless)
4. CSV export automatically includes the new column
5. Old responses show blank for the new field

## Test Execution

```bash
# Backend unit tests
cd backend && bun run test

# Frontend tests
cd frontend && bun run test

# E2E / BDD tests
cd e2e && bun run test

# Lint (all projects)
cd backend && bun run lint
cd frontend && bun run lint
cd infrastructure && bun run lint
```
