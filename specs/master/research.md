# Research: アプリ感想収集フォーム

**Date**: 2026-01-28 | **Plan**: [plan.md](./plan.md)

## 1. DynamoDB Data Model Design

### Decision: Single-table design with sparse attributes

**Rationale:**
- DynamoDB is schemaless by design — adding new attributes requires no migration
- Omitting attributes (instead of storing null) saves storage and keeps sparse indexes efficient
- Only 2 entity types (apps + responses) with simple access patterns — single-table is appropriate
- No ORM or repository pattern needed (constitution: Simplicity Over Abstraction)

**Alternatives considered:**
- Multi-table design — rejected: unnecessary complexity for 2 entity types
- EAV (Entity-Attribute-Value) pattern — rejected: overengineering for this use case
- RDS/PostgreSQL — rejected: requires schema migrations, more operational overhead

### Table Design

```
Table: WebformResponses
  PK: RESPONSE#{responseId}    (ULID for time-ordered uniqueness)
  SK: APP#{appId}#TS#{isoTimestamp}

  GSI: AppIdIndex
    GSI-PK: appId
    GSI-SK: timestamp
    Projection: ALL
```

**Access Patterns:**
| Pattern | Method | Key Condition |
|---------|--------|---------------|
| Submit response | PutItem | PK = RESPONSE#{id} |
| Get all responses (CSV) | Scan with pagination | Full table scan |
| Get responses by app | Query on GSI | appId = "app1" |
| Validate app exists | Config lookup | Not in DynamoDB |

**Schema Evolution:**
- New fields are added as attributes on new items — no migration needed
- Old items simply lack the attribute (sparse)
- CSV export collects union of all attribute names across all items
- TypeScript types use optional properties (`field?: type`)

---

## 2. SurveyJS Integration

### Decision: survey-core + survey-react-ui (v2.x)

**Rationale:**
- SurveyJS is purpose-built for data-driven JSON form definitions
- Built-in Japanese localization support (50+ languages included)
- Rating question type natively supports configurable scale
- `onComplete` event provides clean JSON data for API submission
- Active maintenance (v2.3.x, January 2026)

**Alternatives considered:**
- Custom React forms — rejected: more development effort, no built-in i18n/rating
- React Hook Form — rejected: not data-driven, no form definition sharing
- Formik — rejected: same limitations as React Hook Form

### Packages Required

```
survey-core        # Platform-independent logic
survey-react-ui    # React rendering components
```

### Localization Approach
- Import `survey-core/survey.i18n.ja` for Japanese UI strings
- Form definition JSON supports `{ "en": "...", "ja": "..." }` per field
- Set `survey.locale = "ja"` or `"en"` based on browser/user preference
- SurveyJS handles button labels, validation messages, etc. automatically

### Form Definition (Data-Driven)
- Store form JSON as a TypeScript constant (shared configuration)
- JSON defines questions, types, localized titles, and display options
- Same definition used across all apps — app name injected dynamically
- All fields set with `isRequired: false` (or omitted, as false is default)

---

## 3. AWS CDK Architecture

### Decision: Single stack with RestApi, NodejsFunction, S3/CloudFront

**Rationale:**
- Single stack is simpler for MVP (all resources share lifecycle)
- RestApi over HttpApi for better CloudFront integration and maturity
- NodejsFunction with esbuild for fast bundling and tree-shaking
- OAC (Origin Access Control) over legacy OAI for S3 security
- CloudFront serves as single entry point, eliminating CORS complexity

**Alternatives considered:**
- HttpApi — rejected: less mature CloudFront integration, limited feature set
- Multiple stacks — rejected: unnecessary for MVP scope
- Lambda Function URLs — rejected: explicitly excluded by requirements
- ALB — rejected: explicitly excluded by requirements

### CloudFront Routing

```
CloudFront Distribution
├── /* (default)     → S3 Bucket (SPA with OAC)
│   └── 404 errors → /index.html (SPA client-side routing)
└── /api/*           → API Gateway RestApi origin
    └── Routes to Lambda functions
```

**Key Configuration:**
- `S3BucketOrigin.withOriginAccessControl(bucket)` for secure S3 access
- `errorResponses` to return index.html for 404 (SPA routing)
- `additionalBehaviors` for /api/* path to API Gateway
- Custom origin request policy (exclude Host header to avoid API GW 403)
- `CachePolicy.CACHING_DISABLED` for API behavior

### Lambda Bundling
- `NodejsFunction` with esbuild (automatic TypeScript transpilation)
- `externalModules: ['@aws-sdk/*']` (AWS SDK v3 is in Lambda runtime)
- `minify: true` for smaller bundles
- Node.js 20.x runtime

### CORS
- CloudFront as reverse proxy makes SPA and API same-origin
- CORS headers still needed for development (localhost) and preflight requests
- Configure `defaultCorsPreflightOptions` on RestApi

---

## 4. CSV Generation

### Decision: Manual generation with UTF-8 BOM, direct Lambda response

**Rationale:**
- Simple requirements (known column structure, RFC 4180 escaping)
- No external dependency needed — reduces Lambda bundle size
- Direct Lambda response works for MVP scale (< 9,000 records)
- BOM (`\uFEFF`) required for Japanese text Excel compatibility

**Alternatives considered:**
- csv library (fast-csv, papaparse) — rejected: unnecessary dependency for simple case
- S3 presigned URL approach — rejected: premature optimization for MVP
- Lambda streaming response — rejected: requires Lambda Function URLs (excluded)

### Implementation Details

**BOM**: `\uFEFF` (U+FEFF) prepended to CSV content

**Escaping (RFC 4180):**
- Fields containing comma, newline, or double-quote are wrapped in quotes
- Double-quotes within fields are doubled (`"` → `""`)
- Empty/missing fields rendered as empty string (not null)

**HTTP Response:**
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="feedback.csv"
isBase64Encoded: true  (Lambda response format)
```

**API Gateway:** Binary media type `text/csv` configured

**Capacity Limits:**
| Records | Approach | Status |
|---------|----------|--------|
| < 9,000 | Direct Lambda response | MVP (current) |
| 9,000+ | S3 presigned URL | Future upgrade path |

**Dynamic Columns:**
1. Scan all responses from DynamoDB (with pagination)
2. Collect union of all attribute names
3. Fixed columns first: responseId, appId, appName, timestamp
4. Dynamic columns follow (alphabetical order)
5. Missing attributes in old records → empty cell

---

## 5. App Registration

### Decision: JSON configuration file in backend code

**Rationale:**
- Spec states "apps defined in configuration file or database"
- JSON config is simplest for MVP (YAGNI — no admin UI needed)
- Adding/modifying apps requires code deployment (acceptable for MVP)
- Config can be moved to DynamoDB later if dynamic management is needed

**Alternatives considered:**
- DynamoDB-based app registry — rejected: premature for MVP, adds complexity
- Environment variables — rejected: not structured enough for app metadata
- S3 config file — rejected: adds S3 read on every request

### Config Structure

```typescript
const apps: Record<string, AppConfig> = {
  "app1": { name: "アプリ1", nameEn: "App 1" },
  "app2": { name: "アプリ2", nameEn: "App 2" },
};
```

---

## 6. Routing and 404 Handling

### Decision: Frontend router validates appId via API, shows 404 page

**Rationale:**
- SPA architecture means frontend handles routing
- Frontend fetches app info from `GET /api/{appId}` endpoint
- If app not found, API returns 404 → frontend shows 404 page
- CloudFront error responses handle direct URL access to non-existent SPA routes

**Flow:**
1. User accesses `/{appId}/form`
2. CloudFront serves index.html (SPA)
3. React Router matches `/:appId/form`
4. Component calls `GET /api/{appId}` to validate and get app name
5. If 404 → show error page. If 200 → render form with app name

---

## Sources

### DynamoDB
- [Best practices for designing and using partition keys effectively](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html)
- [Single-table vs. multi-table design in Amazon DynamoDB](https://aws.amazon.com/blogs/database/single-table-vs-multi-table-design-in-amazon-dynamodb/)
- [Evolve your Amazon DynamoDB table's data model](https://aws.amazon.com/blogs/database/evolve-your-amazon-dynamodb-tables-data-model/)
- [Take advantage of sparse indexes](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-indexes-general-sparse-indexes.html)

### SurveyJS
- [React Form Library | Getting Started Guide](https://surveyjs.io/form-library/documentation/get-started-react)
- [Survey Localization](https://surveyjs.io/form-library/documentation/survey-localization)
- [Rating Scale Question](https://surveyjs.io/form-library/documentation/api-reference/rating-scale-question-model)

### AWS CDK / Architecture
- [Deploy a React SPA to S3 and CloudFront](https://docs.aws.amazon.com/prescriptive-guidance/latest/patterns/deploy-a-react-based-single-page-application-to-amazon-s3-and-cloudfront.html)
- [aws-cdk-lib.aws_lambda_nodejs module](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_nodejs-readme.html)
- [CloudFront Origin Access Control L2 construct](https://aws.amazon.com/blogs/devops/a-new-aws-cdk-l2-construct-for-amazon-cloudfront-origin-access-control-oac/)
- [Choose between REST APIs and HTTP APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html)

### CSV
- [RFC 4180: Common Format and MIME Type for CSV Files](https://www.rfc-editor.org/rfc/rfc4180.html)
- [Return binary media from Lambda proxy integration](https://docs.aws.amazon.com/apigateway/latest/developerguide/lambda-proxy-binary-media.html)
- [API Gateway quotas](https://docs.aws.amazon.com/apigateway/latest/developerguide/limits.html)
