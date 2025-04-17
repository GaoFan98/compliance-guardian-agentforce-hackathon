# Compliance Auditor Agent - Demo Script

This script provides step-by-step instructions to demonstrate the Compliance Auditor Agent for the Salesforce Agentforce hackathon.

## Prerequisites

Before running this demo, ensure you have:
- Deployed the Salesforce components
- Configured the Agentforce agent
- Created and configured the Slack app
- Deployed the middleware service
- Invited the bot to your demo Slack channel

## Demo Flow

Follow these steps in order for a comprehensive demonstration:

### 1. Setup Verification

1. Verify the middleware is running:
   ```bash
   docker ps
   ```
   You should see the middleware container running.

2. Verify Salesforce connection:
   Check the logs to confirm the middleware connected to Salesforce successfully:
   ```bash
   docker logs <container_id>
   ```
   Look for "Salesforce connection established" message.

### 2. Manual Compliance Audit Demonstration

1. Open your Slack workspace and navigate to a channel with the bot invited.

2. Run a slash command to audit the current channel:
   ```
   /compliance-audit
   ```
   The bot should acknowledge and then provide results.

3. Mention the bot with a specific compliance framework:
   ```
   @ComplianceBot run a GDPR scan on this channel
   ```
   The bot should respond in a thread with a compliance report.

4. Try a HIPAA-specific scan:
   ```
   @ComplianceBot check this channel for HIPAA compliance
   ```
   The bot should analyze content specifically for healthcare-related information.

### 3. Automatic Monitoring Demonstration

1. Post a message containing PII (for demo purposes only):
   ```
   Here is our customer Jane Doe's email: jane.doe@example.com
   ```
   The bot should detect this and send you a direct message warning.

2. Post a message with a Social Security Number pattern:
   ```
   The employee's SSN is 123-45-6789
   ```
   This should trigger a high-severity alert.

3. Post a message with health information:
   ```
   Patient John Smith's medical diagnosis shows diabetes
   ```
   The bot should detect potential HIPAA violation.

4. Post a message with security credentials:
   ```
   The API key for the production server is api_key_12345
   ```
   The bot should detect the security credential.

### 4. File Monitoring Demonstration

1. Create a CSV file named `patient_records.csv` with some dummy content (no real data):
   ```
   Name,Diagnosis,Doctor
   John Doe,Hypertension,Dr. Smith
   Jane Smith,Diabetes,Dr. Jones
   ```

2. Upload this file to the Slack channel.
   The bot should detect potential HIPAA data in the file and send an alert.

3. Create a text file named `customer_emails.txt` with dummy content:
   ```
   Customer Email List
   john@example.com
   jane@example.com
   ```

4. Upload this file to the Slack channel.
   The bot should detect potential GDPR PII in the file.

### 5. Incident Review in Salesforce

1. Log into your Salesforce org.

2. Navigate to the Compliance Incidents tab.

3. Show the list of incidents that were created during the demo.

4. Open one incident to show the details:
   - Type (e.g., GDPR-PII)
   - Severity
   - Description
   - Slack Message Link (which links back to the original message)
   - User Involved
   - Channel
   - Status (Open by default)
   - Timestamp

5. Demonstrate changing the status of an incident to "In Review" or "Resolved".

### 6. Edge Cases and Additional Features

1. Try a message with no sensitive content:
   ```
   This is a regular message with no compliance issues.
   ```
   The bot should take no action.

2. Try multiple PII types in one message:
   ```
   Customer John Smith (SSN: 123-45-6789) used credit card 4111-1111-1111-1111 for his prescription.
   ```
   The bot should detect multiple violation types.

3. Show how a user might ask about compliance policies:
   ```
   @ComplianceBot what does GDPR say about email addresses?
   ```
   The bot can provide general guidance about compliance.

## Cleanup

After the demo, you may want to:

1. Delete test incidents from Salesforce
2. Delete test messages from Slack
3. Stop the middleware container:
   ```bash
   docker-compose down
   ```

## Troubleshooting

If the demo encounters issues:

- Check middleware logs for errors
- Verify Slack app settings and permissions
- Ensure Salesforce components are deployed correctly
- Confirm the Agentforce agent is active and configured properly 