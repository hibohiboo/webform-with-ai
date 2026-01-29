import { Stack, StackProps, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Table, AttributeType, BillingMode } from "aws-cdk-lib/aws-dynamodb";
import { RestApi, LambdaIntegration, Cors } from "aws-cdk-lib/aws-apigateway";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime, LayerVersion, Code } from "aws-cdk-lib/aws-lambda";
import path from "path";
import { externalModules } from "../constants/lambda-layer";

export class BackendStack extends Stack {
  public readonly apiEndpoint: string;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // DynamoDB Table
    const table = new Table(this, "WebformResponses", {
      tableName: "WebformResponses",
      partitionKey: { name: "PK", type: AttributeType.STRING },
      sortKey: { name: "SK", type: AttributeType.STRING },
      billingMode: BillingMode.PROVISIONED,
      pointInTimeRecovery: false, // コスト削減のため無効
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // GSI: AppIdIndex for querying by appId
    table.addGlobalSecondaryIndex({
      indexName: "AppIdIndex",
      partitionKey: { name: "appId", type: AttributeType.STRING },
      sortKey: { name: "submittedAt", type: AttributeType.STRING },
    });

    // Lambda Layer（共有依存関係）
    const depsLayer = new LayerVersion(this, "DepsLayer", {
      code: Code.fromAsset(path.join(__dirname, "../layers/deps")),
      compatibleRuntimes: [Runtime.NODEJS_24_X],
      description: "Shared dependencies for Lambda functions (ulid)",
    });

    // Lambda: submit-response
    const submitResponseFn = new NodejsFunction(this, "SubmitResponseFn", {
      functionName: "webform-submit-response",
      runtime: Runtime.NODEJS_24_X,
      entry: path.join(
        __dirname,
        "../../backend/src/handlers/submit-response.ts",
      ),
      handler: "handler",
      environment: {
        TABLE_NAME: table.tableName,
      },
      layers: [depsLayer],
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules,
      },
    });
    table.grantWriteData(submitResponseFn);

    // Lambda: download-csv
    const downloadCsvFn = new NodejsFunction(this, "DownloadCsvFn", {
      functionName: "webform-download-csv",
      runtime: Runtime.NODEJS_24_X,
      entry: path.join(__dirname, "../../backend/src/handlers/download-csv.ts"),
      handler: "handler",
      environment: {
        TABLE_NAME: table.tableName,
      },
      layers: [depsLayer],
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules,
      },
    });
    table.grantReadData(downloadCsvFn);

    // API Gateway
    const api = new RestApi(this, "WebformApi", {
      restApiName: "Webform API",
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
      },
    });

    // POST /api/{appId}/responses
    const appIdResource = api.root.addResource("{appId}");
    const responsesResource = appIdResource.addResource("responses");
    responsesResource.addMethod(
      "POST",
      new LambdaIntegration(submitResponseFn),
    );

    // GET /api/responses/csv
    const responsesRootResource = api.root.addResource("responses");
    const csvResource = responsesRootResource.addResource("csv");
    csvResource.addMethod("GET", new LambdaIntegration(downloadCsvFn));

    this.apiEndpoint = api.url;
  }
}
