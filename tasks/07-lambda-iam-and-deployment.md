# Task 07: Create Lambda Function, IAM Role, and Deployment

**Type:** Manual + Code (Infrastructure)
**Phase:** 1 — Compute
**Dependencies:** Task 02, Task 04, Task 05, Task 06

## Description

Create the Lambda function that will serve as the Form.io schema proxy. This task covers the IAM role, VPC configuration, deployment package setup, and environment configuration. The actual handler code is implemented in Tasks 08 and 09.

## Scope

- Create IAM execution role with least-privilege permissions
- Create Lambda function with VPC configuration
- Configure runtime settings
- Set up deployment pipeline (or manual zip deploy for now)

## Steps

### IAM Role

1. **Create IAM Role** `formio-proxy-lambda-role` with:
   - **Trust policy:** Lambda service (`lambda.amazonaws.com`)
   - **Managed policies:**
     - `AWSLambdaVPCAccessExecutionRole` (for VPC ENI management + CloudWatch Logs)
   - **Inline policy** `formio-proxy-secrets`:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": "secretsmanager:GetSecretValue",
           "Resource": "<secret-arn-from-task-05>"
         }
       ]
     }
     ```

### Lambda Function

2. **Create Lambda Function:**
   - **Name:** `formio-proxy`
   - **Runtime:** Node.js 20.x
   - **Architecture:** arm64 (Graviton — cheaper, faster)
   - **Handler:** `index.handler`
   - **Memory:** 256 MB
   - **Timeout:** 30 seconds
   - **Execution role:** `formio-proxy-lambda-role`

3. **VPC Configuration:**
   - **VPC:** Lambda VPC from Task 02
   - **Subnets:** Both private subnets
   - **Security Group:** `formio-proxy-lambda-sg` from Task 04

4. **Environment Variables:**
   - `SECRET_NAME`: `periscope/formio/api-key`
   - `FORMIO_SCHEMA_CACHE_TTL`: `300` (5 minutes, in seconds)
   - Do NOT put the API key here — it comes from Secrets Manager at runtime

5. **Provisioned Concurrency** (optional):
   - Set to 1 if cold start latency (~500ms) is unacceptable
   - Otherwise, leave at 0 — schema syncs are background operations and tolerant of cold starts

### Deployment Package

6. **Project structure:**
   ```
   formio-proxy-lambda/
     index.mjs          # Handler entry point (Tasks 08-09)
     package.json
     node_modules/       # Only @aws-sdk/client-secrets-manager (if not using SDK v3 bundled)
   ```

7. **Deploy** via zip upload or `aws lambda update-function-code`:
   ```bash
   cd formio-proxy-lambda
   zip -r ../formio-proxy.zip .
   aws lambda update-function-code \
     --function-name formio-proxy \
     --zip-file fileb://../formio-proxy.zip
   ```

### Connect to API Gateway

8. **Add Lambda integration** to the API Gateway routes from Task 06:
   - Integration type: `AWS_PROXY`
   - Payload format: `2.0`

## Acceptance Criteria

- [ ] IAM role `formio-proxy-lambda-role` exists with VPC access + Secrets Manager permissions
- [ ] Secrets Manager policy is scoped to the exact secret ARN (not `*`)
- [ ] Lambda function `formio-proxy` exists with correct VPC, subnets, and security group
- [ ] Lambda can be invoked via API Gateway (returns a response, even if placeholder)
- [ ] Lambda can successfully call `secretsmanager:GetSecretValue` at runtime (test with a simple handler that logs "secret retrieved")
- [ ] Lambda can reach the Form.io Docker container IP on port 3001 from within the VPC (test with a simple `fetch` to `http://<ip>:3001`)
- [ ] CloudWatch Logs group is being populated on invocation
