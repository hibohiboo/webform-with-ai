#!/bin/sh
set -e

echo "Waiting for DynamoDB Local..."

until aws dynamodb list-tables \
  --region ap-northeast-1 \
  --endpoint-url http://dynamodb:8000 \
  > /dev/null 2>&1
do
  sleep 1
done

echo "DynamoDB Local is up. Creating table..."

echo "Creating DynamoDB tables..."

aws dynamodb create-table \
  --region ap-northeast-1 \
  --table-name dev-demo-SampleTable-WebformResponses \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://dynamodb:8000 || true

echo "Done."
