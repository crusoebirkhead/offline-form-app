# Task 05: Store Form.io API Key in AWS Secrets Manager

**Type:** Manual (Infrastructure)
**Phase:** 1 — Secrets Management
**Dependencies:** None

## Description

Store the Form.io project API key in AWS Secrets Manager so the Lambda function can retrieve it at runtime without hardcoding it in environment variables or source code. The Lambda's IAM role (Task 07) will be granted read access to this specific secret.

## Scope

- Create a Secrets Manager secret containing the Form.io API key
- Tag it for cost tracking and access auditing
- Note the secret ARN for use in the Lambda IAM policy (Task 07)

## Steps

1. **Create Secret** in AWS Secrets Manager (same region as Lambda):
   - **Name:** `periscope/formio/api-key`
   - **Type:** Other type of secret
   - **Key/Value:**
     ```json
     {
       "apiKey": "<your Form.io project API key>",
       "serverUrl": "http://<formio-private-ip>:3001",
       "projectId": "<your Form.io project ID>"
     }
     ```
   - **Encryption:** Use the default `aws/secretsmanager` KMS key (or a custom CMK if required by policy)

2. **Tags:**
   - `Project: periscope`
   - `Component: formio-proxy`
   - `Environment: dev` (create separate secrets per environment)

3. **Rotation:** Not required for a static API key, but enable if your Form.io setup supports key rotation

4. **Record the Secret ARN** — needed for the Lambda IAM policy in Task 07:
   ```
   arn:aws:secretsmanager:<region>:<account-id>:secret:periscope/formio/api-key-<suffix>
   ```

## Acceptance Criteria

- [ ] Secret `periscope/formio/api-key` exists in Secrets Manager
- [ ] Contains `apiKey`, `serverUrl`, and `projectId` fields
- [ ] Secret value is verified correct by retrieving it via CLI: `aws secretsmanager get-secret-value --secret-id periscope/formio/api-key`
- [ ] Secret ARN is documented for use in Task 07
- [ ] Secret is NOT stored in Lambda environment variables
