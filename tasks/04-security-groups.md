# Task 04: Configure Security Groups for Lambda

**Type:** Manual (Infrastructure)
**Phase:** 1 — AWS Networking
**Dependencies:** Task 02

## Description

Create a dedicated security group for the Lambda function that restricts its network access to only the Form.io Docker container. This follows the principle of least privilege — the Lambda should only be able to reach port 3001 on the Form.io host, nothing else on the VPS network.

## Scope

- Create a security group in the Lambda VPC
- Define minimal egress rules
- Coordinate with the Form.io VPS-side security group (Task 03)

## Steps

1. **Create Security Group** in the Lambda VPC:
   - **Name:** `formio-proxy-lambda-sg`
   - **Description:** "Allows Lambda to reach Form.io Docker container"
   - **VPC:** The Lambda VPC from Task 02

2. **Inbound Rules:**
   - None required (Lambda is invoked by API Gateway, not by inbound network traffic)

3. **Outbound Rules:**
   - `TCP 3001 → <Form.io Docker host private IP>/32` — Form.io API access
   - `TCP 443 → 0.0.0.0/0` — HTTPS outbound for Secrets Manager API calls (required to fetch the API key at runtime)
   - Remove the default "allow all outbound" rule

4. **Form.io VPS side** (if not already done in Task 03):
   - Allow inbound `TCP 3001` from the Lambda security group or Lambda VPC CIDR

## Acceptance Criteria

- [ ] Security group `formio-proxy-lambda-sg` exists in the Lambda VPC
- [ ] Outbound rules are restricted to port 3001 (Form.io) and port 443 (Secrets Manager)
- [ ] No inbound rules exist (Lambda doesn't accept inbound connections)
- [ ] Default "allow all outbound" rule is removed
- [ ] Form.io VPS firewall allows inbound 3001 from Lambda VPC CIDR
