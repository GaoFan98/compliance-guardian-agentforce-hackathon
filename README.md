# Slack-Integrated Compliance Auditor Agent

A compliance monitoring solution built on Salesforce Agentforce that scans Slack messages and files for compliance violations related to GDPR, HIPAA, and internal security policies.

## Overview

This solution integrates Slack as the user interface with Salesforce Agentforce as the brain of a compliance auditing agent. The agent monitors Slack messages in real-time to detect potential policy violations related to sharing sensitive information.

### Key Features

- **Real-time compliance monitoring** of Slack messages and files
- **On-demand compliance audits** via Slack commands
- **Automated alerts** for compliance violations
- **Detailed logging** of incidents in Salesforce
- **Extensible framework** for adding new compliance rules

## Architecture

The system consists of:

1. **Slack App (Compliance Bot)**: Interfaces with users in Slack
2. **Agentforce Agent (Compliance Auditor)**: Analyzes content using LLM technology
3. **Integration Layer**: Securely connects Slack to Salesforce
4. **Salesforce Platform**: Stores compliance incidents and rules

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Salesforce Agentforce-enabled org
- Slack workspace with admin permissions

### Setup

1. Clone this repository
2. Configure environment variables in `.env`
3. Run `docker-compose up -d`
4. Follow the setup instructions for Salesforce and Slack integration

## Usage

### Slack Commands

- `/compliance-audit` - Run a compliance scan on the current channel
- `@ComplianceBot run a GDPR scan on this channel` - Natural language request for audit

### Monitoring

The bot automatically monitors messages in channels it's added to and alerts users of potential violations.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 