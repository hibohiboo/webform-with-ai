# Implementation Plan: アプリ感想収集フォーム (App Feedback Collection Form)

**Branch**: `master` | **Date**: 2026-01-28 | **Spec**: [spec.md](../001-app-feedback-form/spec.md)
**Input**: Feature specification from `/specs/001-app-feedback-form/spec.md`

## Summary

Build an MVP web feedback form for collecting user responses across multiple applications. The system consists of a SurveyJS-based SPA hosted on S3/CloudFront, with backend APIs on API Gateway + Lambda, and DynamoDB for schema-flexible storage. Infrastructure is defined entirely in AWS CDK (TypeScript). The form supports Japanese/English, data-driven field definitions, schema evolution without migration, and CSV export with BOM.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20.x for Lambda runtime)
**Primary Dependencies**: AWS CDK, SurveyJS (survey-react-ui), React 18, esbuild (Lambda bundling)
**Storage**: Amazon DynamoDB (single-table design for schema-flexible document storage)
**Testing**: Vitest (unit/integration), Playwright (BDD/E2E)
**Target Platform**: Web SPA on S3/CloudFront, Lambda on Node.js 20.x
**Project Type**: Web application (frontend + backend + infrastructure)
**Performance Goals**: Form submission < 1s, CSV download < 5s for 1000 records
**Constraints**: No authentication, no admin UI, MVP scope, all fields optional
**Scale/Scope**: Small scale MVP, hundreds to low thousands of responses

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Readability First
- [x] **PASS**: Clear naming conventions planned (TypeScript with explicit types)
- [x] **PASS**: LF line endings enforced via .gitattributes and editor config
- [x] **PASS**: Comments for business rules (form definition, CSV export logic)

### II. Test-Driven Development (NON-NEGOTIABLE)
- [x] **PASS**: Unit tests for Lambda handlers (Vitest)
- [x] **PASS**: Integration tests for API endpoints
- [x] **PASS**: BDD/E2E tests for user scenarios (Playwright)
- [x] **PASS**: Tests executed with `bun run test`

### III. Simplicity Over Abstraction
- [x] **PASS**: Single-table DynamoDB (no ORM, no repository pattern)
- [x] **PASS**: Minimal Lambda handlers (one per API endpoint)
- [x] **PASS**: No authentication layer, no admin UI
- [x] **PASS**: Direct CDK constructs (no custom construct libraries)

### IV. User Experience Priority
- [x] **PASS**: User stories prioritized (P1 > P2 > P3)
- [x] **PASS**: SurveyJS handles form UX (validation, i18n)
- [x] **PASS**: CSV with BOM for Excel compatibility

**Gate Result**: PASS — No violations detected.

## Project Structure

### Documentation (this feature)

```text
specs/master/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api.yaml         # OpenAPI specification
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
infrastructure/
├── bin/
│   └── app.ts                  # CDK app entry point
├── lib/
│   └── webform-stack.ts        # CDK stack (S3, CloudFront, API GW, Lambda, DynamoDB)
├── cdk.json
├── tsconfig.json
└── package.json

backend/
├── src/
│   ├── handlers/
│   │   ├── submit-response.ts  # POST /api/{appId}/responses
│   │   ├── download-csv.ts     # GET /api/responses/csv
│   │   └── get-app.ts          # GET /api/{appId}
│   ├── lib/
│   │   ├── dynamodb.ts         # DynamoDB client helpers
│   │   ├── csv.ts              # CSV generation with BOM
│   │   └── apps-config.ts      # App registry (config-driven)
│   └── shared/
│       └── types.ts            # Shared type definitions
├── tests/
│   ├── unit/
│   │   ├── submit-response.test.ts
│   │   ├── download-csv.test.ts
│   │   └── csv.test.ts
│   └── integration/
│       └── api.test.ts
├── tsconfig.json
└── package.json

frontend/
├── src/
│   ├── App.tsx                 # Router + SurveyJS form page
│   ├── main.tsx                # Entry point
│   ├── components/
│   │   ├── FeedbackForm.tsx    # SurveyJS form wrapper
│   │   └── ThankYou.tsx        # Submission confirmation
│   ├── lib/
│   │   ├── api.ts              # API client
│   │   ├── form-definition.ts  # Data-driven form JSON (shared)
│   │   └── i18n.ts             # Japanese/English translations
│   └── hooks/
│       └── useApp.ts           # App data fetching hook
├── tests/
│   ├── components/
│   │   └── FeedbackForm.test.tsx
│   └── hooks/
│       └── useApp.test.ts
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json

e2e/
├── tests/
│   ├── submit-feedback.spec.ts   # User Story 1 BDD scenarios
│   ├── download-csv.spec.ts      # User Story 2 BDD scenarios
│   └── schema-evolution.spec.ts  # User Story 3 BDD scenarios
├── playwright.config.ts
└── package.json
```

**Structure Decision**: Web application pattern with separated frontend, backend, infrastructure, and e2e directories. Each has its own package.json for independent dependency management. The `shared/` types in backend are kept minimal — frontend uses its own API client types.

## Complexity Tracking

> No violations detected. No complexity justification required.
