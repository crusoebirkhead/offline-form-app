# Task 03: Establish VPC Peering to Form.io VPS

**Type:** Manual (Infrastructure)
**Phase:** 1 — AWS Networking
**Dependencies:** Task 02

## Description

Create a VPC peering connection between the AWS VPC (hosting the Lambda) and the private VPS network where the Form.io Docker container runs. This gives the Lambda a private network path to the Form.io container without exposing it to the public internet.

The specifics depend on where the Form.io VPS is hosted:
- **AWS VPS:** Standard VPC Peering (same or cross-account)
- **Non-AWS VPS (e.g., DigitalOcean, Linode, Hetzner):** AWS Site-to-Site VPN or AWS Transit Gateway with a VPN appliance on the VPS side

## Scope

- Establish network connectivity between Lambda VPC and Form.io VPS
- Update route tables on both sides
- Verify connectivity with a test Lambda

## Steps (AWS-to-AWS VPC Peering)

1. **Create Peering Connection:**
   - Requester: Lambda VPC
   - Accepter: Form.io VPS VPC (same or cross-account/cross-region)

2. **Accept the Peering Request** in the accepter VPC's account/region

3. **Update Route Tables — Lambda side:**
   - Add route: `<Form.io VPS CIDR> → pcx-<peering-id>` to the private subnet route table

4. **Update Route Tables — Form.io VPS side:**
   - Add route: `10.1.0.0/16 → pcx-<peering-id>` (or your Lambda VPC CIDR)

5. **Update Security Groups — Form.io VPS side:**
   - Allow inbound TCP on port 3001 (or whatever port Form.io listens on) from `10.1.0.0/16`

6. **DNS Resolution** (if using private DNS):
   - Enable DNS resolution for the peering connection on both sides

## Steps (Non-AWS VPS — VPN)

1. Set up a VPN appliance (e.g., WireGuard, StrongSwan) on the Form.io VPS
2. Create an AWS Site-to-Site VPN connection attached to a Virtual Private Gateway on the Lambda VPC
3. Configure tunnel IPs and pre-shared keys on both sides
4. Update route tables to route Form.io VPS CIDR through the VPN gateway
5. Verify connectivity

## Acceptance Criteria

- [ ] Peering connection (or VPN tunnel) is in `active` state
- [ ] Lambda VPC route table has a route to the Form.io VPS CIDR via the peering/VPN
- [ ] Form.io VPS route table has a return route to the Lambda VPC CIDR
- [ ] Form.io VPS security group allows inbound on port 3001 from Lambda VPC CIDR
- [ ] A test Lambda deployed in the private subnet can `curl http://<formio-private-ip>:3001` and get a response
