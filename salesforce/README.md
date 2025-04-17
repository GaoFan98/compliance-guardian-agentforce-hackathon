# Salesforce Implementation for Compliance Auditor Agent

This directory contains the Salesforce components for the Compliance Auditor Agent.

## Components

1. **ComplianceActions.cls** - Custom Apex actions for the Agentforce agent:
   - `scanContentForCompliance` - Action to analyze text for compliance issues
   - `logComplianceIncident` - Action to create a record of a compliance violation

2. **SlackEventHandler.cls** - REST API endpoint to receive events from Slack:
   - Handles URL verification challenges
   - Processes message, mention, and file events
   - Processes slash commands

3. **Compliance_Incident__c.object** - Custom object metadata for storing compliance incidents

## Setup Instructions

### 1. Create Custom Object

1. In Salesforce Setup, go to **Object Manager** > **Create** > **Custom Object**
2. Create a new custom object named `Compliance_Incident__c` with the fields defined in the object metadata file
3. Alternatively, deploy the metadata using Salesforce CLI or change sets

### 2. Deploy Apex Classes

1. Deploy the Apex classes using Salesforce Developer Console, VS Code, or Salesforce CLI
2. Ensure all classes compile successfully

### 3. Configure Agentforce Agent

1. In Salesforce Setup, go to **Agentforce** > **Agents**
2. Create a new agent named "Compliance Auditor"
3. Configure the agent with the following topics:
   - "Manual Compliance Audit" - For handling explicit audit requests
   - "Auto Policy Monitor" - For automatically monitoring content

4. Add the custom actions to the agent:
   - Add the `ComplianceActions.scanContentForCompliance` action 
   - Add the `ComplianceActions.logComplianceIncident` action

5. Add Slack actions to the agent:
   - "Send a Slack Direct Message"
   - "Search Slack"
   - Other Slack skills as needed

### 4. Set Up Connected App for Slack

1. In Salesforce Setup, go to **App Manager** > **New Connected App**
2. Configure the Connected App for Slack integration
3. Set up OAuth scopes for Slack
4. Complete the handshake between Salesforce and Slack

### 5. Security Considerations

- Set up appropriate field-level security for the `Compliance_Incident__c` object
- Restrict access to sensitive compliance data
- Use Named Credentials for secure API integrations

## Testing

1. Test the Apex classes using developer console or unit tests
2. Verify the Agentforce agent can execute the custom actions
3. Test the REST endpoint with simulated Slack requests 