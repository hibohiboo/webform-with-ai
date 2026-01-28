# Data Model: アプリ感想収集フォーム

**Date**: 2026-01-28 | **Plan**: [plan.md](./plan.md)

## Entities

### App (アプリ)

Configuration-driven entity. Not stored in DynamoDB — defined in backend code as JSON config.

| Field | Type | Description |
|-------|------|-------------|
| appId | string | URL path identifier (e.g., "app1") |
| name | string | Display name in Japanese (e.g., "アプリ1") |
| nameEn | string | Display name in English (e.g., "App 1") |

**Storage**: TypeScript constant in `backend/src/lib/apps-config.ts`

```typescript
type AppConfig = {
  appId: string;
  name: string;
  nameEn: string;
};
```

**Constraints**:
- appId must be URL-safe (alphanumeric + hyphens)
- name and nameEn are required
- No duplicate appIds

---

### Response (回答)

Core entity. Stored in DynamoDB.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| responseId | string (ULID) | Yes | Unique response identifier |
| appId | string | Yes | Reference to app configuration |
| submittedAt | string (ISO 8601) | Yes | Submission timestamp |
| name | string | No | Respondent name |
| rating | number | No | Rating value (UI guides 1-3, storage accepts any) |
| comment | string | No | Free-text comment |
| *(future fields)* | *any* | *No* | *Additional fields added over time* |

**Storage**: DynamoDB single-table

```typescript
type FeedbackResponse = {
  responseId: string;
  appId: string;
  submittedAt: string;
  name?: string;
  rating?: number;
  comment?: string;
  [key: string]: unknown;  // Schema evolution: future fields
};
```

**Constraints**:
- responseId is generated server-side (ULID)
- submittedAt is generated server-side (ISO 8601 UTC)
- All user-input fields are optional
- Backend accepts any values without validation (per FR-003-A)
- Duplicate submissions from same user are stored as separate records (per FR-010)

---

## DynamoDB Table Design

### Table: WebformResponses

| Attribute | Type | Role |
|-----------|------|------|
| PK | String | Partition key: `RESPONSE#{responseId}` |
| SK | String | Sort key: `APP#{appId}#TS#{submittedAt}` |
| responseId | String | ULID |
| appId | String | App identifier |
| submittedAt | String | ISO 8601 timestamp |
| name | String | Optional respondent name |
| rating | Number | Optional rating value |
| comment | String | Optional free-text comment |

**Billing**: PAY_PER_REQUEST (on-demand)
**Encryption**: AWS managed encryption
**Point-in-time recovery**: Enabled

### GSI: AppIdIndex

| Attribute | Type | Role |
|-----------|------|------|
| appId | String | GSI partition key |
| submittedAt | String | GSI sort key |

**Projection**: ALL (required for CSV export flexibility with future fields)

### Access Patterns

| Pattern | Operation | Key Condition |
|---------|-----------|---------------|
| Submit response | PutItem | PK=RESPONSE#{id}, SK=APP#{appId}#TS#{ts} |
| Export all as CSV | Scan (paginated) | Full table scan, 1MB per page |
| Query by appId | Query on AppIdIndex | appId = {appId} |

---

## Schema Evolution Strategy

### Adding New Fields

When a new form field is added (e.g., "recommendation"):

1. **Form definition**: Add new question to SurveyJS JSON
2. **Backend handler**: No change needed — accepts any JSON fields
3. **DynamoDB**: New items include the attribute; old items lack it (sparse)
4. **CSV export**: Discovers all attribute names across all items, includes new column
5. **TypeScript types**: Add optional property to FeedbackResponse type

### CSV Column Generation

1. Scan all items from DynamoDB
2. Collect union of all attribute keys (excluding PK, SK)
3. Fixed columns first: `responseId`, `appId`, `submittedAt`
4. Dynamic columns in alphabetical order: `comment`, `name`, `rating`, ...
5. Old records without new fields → empty cell in CSV

### Example: Before and After Adding "recommendation"

**Before** (CSV):
```csv
responseId,appId,submittedAt,comment,name,rating
r001,app1,2026-01-28T10:00:00Z,使いやすかった,山田太郎,2
r002,app1,2026-01-28T11:00:00Z,,,
```

**After** adding "recommendation" field:
```csv
responseId,appId,submittedAt,comment,name,rating,recommendation
r001,app1,2026-01-28T10:00:00Z,使いやすかった,山田太郎,2,
r002,app1,2026-01-28T11:00:00Z,,,,
r003,app1,2026-01-29T09:00:00Z,最高です,佐藤花子,3,5
```

---

## Relationships

```
AppConfig (JSON config)        FeedbackResponse (DynamoDB)
┌─────────────────┐            ┌──────────────────────┐
│ appId (PK)      │◄───────────│ appId (FK)           │
│ name            │            │ responseId (PK)      │
│ nameEn          │            │ submittedAt          │
└─────────────────┘            │ name?                │
                               │ rating?              │
  1 App : N Responses          │ comment?             │
                               │ [future fields]?     │
                               └──────────────────────┘
```

- One App has many Responses (1:N)
- Relationship enforced at application level (not database foreign key)
- Invalid appId in request → 404 from app config lookup
