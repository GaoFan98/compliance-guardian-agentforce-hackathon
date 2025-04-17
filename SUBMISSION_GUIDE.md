# Hackathon Submission Guide

This document provides guidance for submitting the Compliance Auditor Agent to the Salesforce Agentforce Hackathon.

## Submission Requirements

According to the hackathon rules, your submission must include:

1. **Video Demo (5 minutes max)**: Show your solution in action
2. **Admin Credentials**: Provide access to the Salesforce orgs
3. **Salesforce Org ID**: Include your org identifier
4. **1-2 Sentence Pitch**: Brief description of your project
5. **Optional**: Indicate if you're opting in for the Slack Bonus Prize
6. **Optional**: List what technologies you used and future enhancements
7. **Optional**: URL to your code repository

## Video Demo Script

Here's a recommended script for your 5-minute demo video:

### 1. Introduction (30 seconds)
- "Welcome to the Compliance Auditor Agent demo. This solution uses Salesforce Agentforce to monitor Slack communications for compliance violations related to GDPR, HIPAA, and internal security policies."
- Briefly explain the business problem: "Organizations struggle to prevent sensitive data leaks in messaging platforms. Our solution provides real-time monitoring and alerts."

### 2. Architecture Overview (30 seconds)
- Show a simple diagram of the solution components:
  - Slack Bot (interface)
  - Agentforce Agent (AI brain)
  - Salesforce Custom Object (persistence)
- Explain "The agent uses custom actions to scan content and log incidents, combining pattern matching with AI reasoning."

### 3. Demo Scenarios (3 minutes)

#### Manual Audit
- Show invoking the agent via slash command:
  ```
  /compliance-audit
  ```
- Show mentioning the agent:
  ```
  @ComplianceBot run a GDPR scan on this channel
  ```
- Highlight the agent's response in the thread

#### Automatic Monitoring
- Post a message with sensitive information:
  ```
  Here is our customer Jane Doe's SSN: 123-45-6789 and email: jane.doe@example.com
  ```
- Show the bot DM'ing you with a warning
- Post a file named "patient_records.csv" to demonstrate file detection

#### Incident Management
- Switch to Salesforce to show the logged incidents
- Show the custom object records with details (type, severity, etc.)
- Briefly demonstrate how a compliance officer would review these records

### 4. Technical Highlights (30 seconds)
- Highlight the custom Apex actions created for Agentforce
- Mention the Node.js middleware for handling Slack events
- Emphasize the security considerations and Trust Layer usage

### 5. Conclusion (30 seconds)
- Summarize the business value: "The Compliance Auditor Agent helps organizations maintain regulatory compliance and protect sensitive data in real-time."
- Mention extensibility: "The solution can be easily extended to support additional compliance frameworks and data sources."
- Thank the judges!

## Submission Statement Examples

### 1-2 Sentence Pitch
"The Compliance Auditor Agent uses Agentforce to monitor Slack communications in real-time for potential compliance violations related to GDPR, HIPAA, and internal security policies. It detects sensitive information being shared, alerts users, and provides a comprehensive audit trail for compliance officers."

### What was used & what else would you do with more time?
"We used Salesforce Agentforce, Node.js with the Slack Bolt SDK, Apex custom actions, and Docker for containerization. With more time, we would enhance file content scanning capabilities, implement a feedback loop for false positives, add more advanced pattern recognition for additional compliance frameworks, and create a Lightning dashboard for compliance officers."

## Slack Bonus Prize
If submitting for the Slack Bonus Prize, highlight these aspects:
- The tight integration between Slack and Salesforce Agentforce
- The user experience in Slack (commands, mentions, notifications)
- The real-time monitoring capabilities
- The secure handling of Slack data in compliance processes

## Final Checklist

Before submitting, ensure:

- [x] Your demo video is under 5 minutes and clearly shows the solution in action
- [x] You've provided admin credentials to the orgs as required
- [x] You've included your Salesforce Org ID
- [x] Your 1-2 sentence pitch is clear and compelling
- [x] If applicable, you've indicated that you're opting in for the Slack Bonus Prize
- [x] You've listed what was used and future enhancements
- [x] You've included a URL to your code repository
- [x] All code is production-ready and functions consistently

Good luck with your submission! 