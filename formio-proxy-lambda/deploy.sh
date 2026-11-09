#!/bin/bash
set -euo pipefail

# ---------------------------------------------------------------------------
# formio-proxy Lambda — manual deployment script
# ---------------------------------------------------------------------------
# Prerequisites:
#   - AWS CLI configured with appropriate credentials
#   - Node.js 20.x installed locally (for npm install)
#
# Usage:
#   1. First-time setup:  ./deploy.sh setup
#   2. Code updates:      ./deploy.sh
# ---------------------------------------------------------------------------

FUNCTION_NAME="formio-proxy"
ROLE_NAME="formio-proxy-lambda-role"
REGION="${AWS_REGION:-us-east-1}"
RUNTIME="nodejs20.x"
ARCHITECTURE="arm64"
HANDLER="index.handler"
MEMORY=256
TIMEOUT=30

DIR="$(cd "$(dirname "$0")" && pwd)"

# ---- Build zip ----
build() {
  echo "==> Installing dependencies..."
  cd "$DIR"
  npm ci --omit=dev

  echo "==> Packaging..."
  rm -f "$DIR/../formio-proxy.zip"
  zip -r "$DIR/../formio-proxy.zip" . -x '*.git*' 'iam/*' 'deploy.sh' '*.md'
  echo "==> Created formio-proxy.zip"
}

# ---- First-time IAM + Lambda creation ----
setup() {
  echo "==> Creating IAM role: $ROLE_NAME"
  ROLE_ARN=$(aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document file://"$DIR/iam/trust-policy.json" \
    --query 'Role.Arn' --output text)

  echo "    Role ARN: $ROLE_ARN"

  echo "==> Attaching VPC access policy..."
  aws iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole

  echo "==> Attaching Secrets Manager inline policy..."
  echo "    *** Edit iam/secrets-policy.json with your secret ARN first! ***"
  aws iam put-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-name formio-proxy-secrets \
    --policy-document file://"$DIR/iam/secrets-policy.json"

  # IAM propagation delay
  echo "==> Waiting 10s for IAM propagation..."
  sleep 10

  build

  echo "==> Creating Lambda function: $FUNCTION_NAME"
  aws lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --runtime "$RUNTIME" \
    --architectures "$ARCHITECTURE" \
    --handler "$HANDLER" \
    --memory-size "$MEMORY" \
    --timeout "$TIMEOUT" \
    --role "$ROLE_ARN" \
    --zip-file fileb://"$DIR/../formio-proxy.zip" \
    --environment "Variables={SECRET_NAME=periscope/formio/api-key,FORMIO_SCHEMA_CACHE_TTL=300}"

  echo ""
  echo "==> Done! Next steps:"
  echo "    1. Add VPC config (subnets + security group) via console or:"
  echo "       aws lambda update-function-configuration \\"
  echo "         --function-name $FUNCTION_NAME \\"
  echo "         --vpc-config SubnetIds=subnet-XXX,subnet-YYY,SecurityGroupIds=sg-ZZZ"
  echo ""
  echo "    2. Connect to API Gateway (AWS_PROXY integration, payload 2.0)"
}

# ---- Update code only ----
update() {
  build

  echo "==> Updating Lambda code..."
  aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file fileb://"$DIR/../formio-proxy.zip"

  echo "==> Deployed."
}

# ---- Entrypoint ----
case "${1:-update}" in
  setup) setup ;;
  update) update ;;
  build)  build ;;
  *)
    echo "Usage: $0 [setup|update|build]"
    exit 1
    ;;
esac
