# Task 02: Create AWS VPC and Subnets for Lambda

**Type:** Manual (Infrastructure)
**Phase:** 1 — AWS Networking
**Dependencies:** None

## Description

Create a VPC in the same AWS region as your workload to host the Lambda function. The Lambda needs private subnets (no public internet access required) with a route to the Form.io VPS via VPC peering. A NAT Gateway is only needed if the Lambda must reach the public internet (e.g., for JWKS fetching — but API Gateway handles JWT validation, so this may not be necessary).

If you already have an AWS VPC that can peer with the Form.io VPS, skip VPC creation and proceed to Task 03.

## Scope

- Create VPC with private subnets across 2+ AZs (for Lambda HA)
- Create route tables for the private subnets
- Optionally create a NAT Gateway if Lambda needs outbound internet access

## Steps

1. **Create VPC:**
   - CIDR: `10.1.0.0/16` (ensure no overlap with the Form.io VPS CIDR)
   - Enable DNS resolution and DNS hostnames

2. **Create Private Subnets** (minimum 2 for Lambda multi-AZ):
   - `10.1.1.0/24` in AZ-a
   - `10.1.2.0/24` in AZ-b

3. **Create Route Table** for private subnets:
   - Local route: `10.1.0.0/16 → local`
   - VPC peering route will be added in Task 03
   - Associate both subnets

4. **(Optional) NAT Gateway** — only if Lambda needs outbound internet:
   - Create a public subnet (`10.1.0.0/24`)
   - Create Internet Gateway, attach to VPC
   - Create NAT Gateway in public subnet with Elastic IP
   - Add route `0.0.0.0/0 → NAT Gateway` to private route table

## Acceptance Criteria

- [x] VPC exists with DNS resolution and hostnames enabled
- [x] CIDR does not overlap with the Form.io VPS network CIDR
- [x] At least 2 private subnets exist in different AZs
- [x] Route table is associated with private subnets
- [x] (If NAT needed) NAT Gateway is operational and private subnets can reach the internet
