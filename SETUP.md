# Compliance Auditor Agent - Setup Guide

This guide will walk you through setting up the Slack-Integrated Compliance Auditor Agent for the Salesforce Agentforce hackathon.

## Prerequisites

- **Salesforce Org**: You need an Agentforce-enabled Salesforce Developer Edition org
- **Slack Workspace**: Admin access to a Slack workspace for testing
- **Docker**: Docker and Docker Compose installed on your machine

## Step 1: Set Up Salesforce Components

### Create Custom Object

1. Log into your Salesforce org
2. Navigate to Setup > Object Manager > Create > Custom Object
3. Create a new custom object called "Compliance Incident" with the following fields:
   - Type (Picklist): GDPR-PII, HIPAA, PCI-DSS, Info Security, Internal Policy, Other
   - Severity (Picklist): Low, Medium, High, Critical
   - Description (Text Area)
   - Slack Message Link (URL)
   - User Involved (Text)
   - Channel (Text)
   - Status (Picklist): Open, In Review, Resolved, False Positive
   - Timestamp (DateTime)

Alternatively, you can deploy the metadata from the `salesforce` directory using SFDX or Metadata API.

### Deploy Apex Classes

1. In Salesforce, open the Developer Console
2. Create and upload the Apex classes from the `salesforce` directory:
   - `ComplianceActions.cls` - Custom actions for the agent
   - `SlackEventHandler.cls` - REST endpoint for Slack events

### Create and Configure Agentforce Agent

1. In Salesforce Setup, navigate to Agentforce > Agents
2. Create a new agent named "Compliance Auditor"
3. Configure topics:
   - **Manual Compliance Audit**: For explicit audit requests
     - System Instruction: "You are a Compliance Auditor Agent. When the user asks for a compliance scan, determine the scope (e.g. recent messages or a specific file) and analyze it for any GDPR, HIPAA, or internal policy violations. Provide a clear summary of any issues found, or a confirmation if no issues. Do not disclose sensitive data openly; only indicate the type of data (e.g. 'personal address detected'). Offer helpful next steps for compliance."
   - **Auto Policy Monitor**: For automatic monitoring
     - System Instruction: "You are monitoring content for compliance. The input will be a snippet of text or file metadata from Slack. Analyze it silently. If it contains sensitive information or policy violations, prepare to execute alert and logging actions. Keep all details confidential and only share minimal required info in alerts."

4. Add custom actions to the agent:
   - Add the `ComplianceActions.scanContentForCompliance` action
   - Add the `ComplianceActions.logComplianceIncident` action

5. Add Slack actions to the agent:
   - "Send a Slack Direct Message" 
   - "Search Slack"
   - Other Slack skills as needed

6. Activate the agent

## Step 2: Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and click "Create New App"
2. Choose "From scratch" and provide a name ("Compliance Auditor") and workspace
3. Under "OAuth & Permissions" add the following scopes:
   - `app_mentions:read` - To respond to mentions
   - `chat:write` - To send messages
   - `commands` - To create slash commands
   - `files:read` - To access file content
   - `channels:history` - To read messages
   - `channels:read` - To identify channels
   - `users:read` - To get user information

4. Create a slash command:
   - Command: `/compliance-audit`
   - Request URL: Your middleware URL (we'll set this up later)
   - Description: "Run a compliance audit on this channel"

5. Set up Event Subscriptions:
   - Request URL: Your middleware URL
   - Subscribe to bot events:
     - `message.channels` - Messages in public channels
     - `app_mention` - When someone mentions your bot
     - `file_shared` - When a file is shared

6. Install the app to your workspace

7. Copy your Bot Token (`xoxb-...`) and Signing Secret from the app settings

## Step 3: Configure and Deploy the Middleware

1. Clone this repository
2. Create a `.env` file based on `.env.example`:
   ```
   # Slack Configuration
   SLACK_SIGNING_SECRET=your_slack_signing_secret
   SLACK_BOT_TOKEN=xoxb-your-token
   
   # Salesforce Configuration
   SALESFORCE_LOGIN_URL=https://login.salesforce.com
   SALESFORCE_USERNAME=your_username@example.com
   SALESFORCE_PASSWORD=your_password_with_security_token
   SALESFORCE_AGENT_ID=your_agent_id
   
   # Application Configuration
   NODE_ENV=production
   PORT=3000
   ```

3. Build and start the middleware using Docker:
   ```bash
   docker-compose up -d
   ```

4. If running locally, you'll need to use a service like ngrok to expose your local server:
   ```bash
   ngrok http 3000
   ```
   
   Then update your Slack app's Request URLs with the ngrok URL.

## Step 4: Connect Salesforce and Slack

1. In Salesforce Setup, go to App Manager > New Connected App
2. Create a connected app for Slack:
   - Enable OAuth settings
   - Set callback URL (per Salesforce Slack integration requirements)
   - Add necessary OAuth scopes
   
3. Go to your Agentforce agent, add a Connection of type "API"
4. Select the Slack connected app you created
5. Complete the OAuth flow to authorize Salesforce to interact with Slack

## Step 5: Testing the Integration

1. Invite the Compliance Bot to a channel in Slack:
   ```
   /invite @ComplianceBot
   ```

2. Test the slash command:
   ```
   /compliance-audit
   ```

3. Test a mention:
   ```
   @ComplianceBot run a GDPR scan on this channel
   ```

4. Post a test message with PII (for demo purposes):
   ```
   Here is Jane Doe's email: jane.doe@example.com
   ```
   The bot should detect this and send you a DM about the policy violation.

5. Check in Salesforce to see if incidents are being logged:
   - Navigate to the Compliance Incidents tab
   - Verify records are being created

## Troubleshooting

- **Slack events not reaching middleware**: Check your Request URL configuration and server logs
- **Agent not responding**: Verify the agent is active in Salesforce and the agent ID is correct in your .env file
- **Authentication errors**: Check your Salesforce credentials and Connected App configuration
- **Missing incidents in Salesforce**: Verify the Compliance_Incident__c object is properly configured and accessible

## Next Steps

- Customize the compliance rules by modifying the patterns in `ComplianceActions.cls`
- Add more advanced file scanning capabilities
- Implement a user feedback loop for false positives
- Add dashboard reporting in Salesforce for compliance officers 