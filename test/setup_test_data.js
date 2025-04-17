/**
 * Compliance Auditor Agent - Test Data Setup
 * 
 * This script sets up test data in Salesforce for demonstrating the Compliance Auditor Agent.
 * It creates sample compliance incidents to show in the demo.
 */

const jsforce = require('jsforce');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '../.env' });

// Sample incidents to create
const sampleIncidents = [
  {
    Type__c: 'GDPR-PII',
    Severity__c: 'Medium',
    Description__c: 'Detected email address in public channel #general',
    Slack_Message_Link__c: 'https://slack.com/archives/CXXXXXX/p1234567890123456',
    User_Involved__c: 'U012345ABC',
    Channel__c: 'CXXXXXX',
    Status__c: 'Open',
    Timestamp__c: new Date().toISOString()
  },
  {
    Type__c: 'HIPAA',
    Severity__c: 'High',
    Description__c: 'Detected medical information in file patient_records.csv',
    Slack_Message_Link__c: 'https://slack.com/archives/CXXXXXX/p1234567890123457',
    User_Involved__c: 'U012345ABC',
    Channel__c: 'CXXXXXX',
    Status__c: 'Open',
    Timestamp__c: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
  },
  {
    Type__c: 'PCI-DSS',
    Severity__c: 'High',
    Description__c: 'Detected credit card number in message',
    Slack_Message_Link__c: 'https://slack.com/archives/CXXXXXX/p1234567890123458',
    User_Involved__c: 'U012345DEF',
    Channel__c: 'CXXXXXX',
    Status__c: 'In Review',
    Timestamp__c: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
  },
  {
    Type__c: 'Info Security',
    Severity__c: 'Critical',
    Description__c: 'Detected API key in public channel #development',
    Slack_Message_Link__c: 'https://slack.com/archives/CYYYYYY/p1234567890123459',
    User_Involved__c: 'U012345GHI',
    Channel__c: 'CYYYYYY',
    Status__c: 'Resolved',
    Timestamp__c: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
  },
  {
    Type__c: 'Internal Policy',
    Severity__c: 'Low',
    Description__c: 'Detected confidential marker in message',
    Slack_Message_Link__c: 'https://slack.com/archives/CXXXXXX/p1234567890123460',
    User_Involved__c: 'U012345JKL',
    Channel__c: 'CXXXXXX',
    Status__c: 'False Positive',
    Timestamp__c: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days ago
  }
];

async function setupTestData() {
  console.log('Setting up test data in Salesforce...');
  
  // Create Salesforce connection
  const conn = new jsforce.Connection({
    loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com'
  });
  
  try {
    // Login to Salesforce
    await conn.login(
      process.env.SALESFORCE_USERNAME,
      process.env.SALESFORCE_PASSWORD
    );
    
    console.log('Connected to Salesforce');
    
    // Create sample incidents
    console.log('Creating sample compliance incidents...');
    
    for (const incident of sampleIncidents) {
      try {
        const result = await conn.sobject('Compliance_Incident__c').create(incident);
        
        if (result.success) {
          console.log(`Created incident with ID: ${result.id}`);
        } else {
          console.error(`Failed to create incident: ${result.errors.join(', ')}`);
        }
      } catch (error) {
        console.error('Error creating incident:', error.message);
      }
    }
    
    console.log('Test data setup complete');
  } catch (error) {
    console.error('Error connecting to Salesforce:', error.message);
  } finally {
    // Logout
    if (conn.accessToken) {
      await conn.logout();
      console.log('Logged out of Salesforce');
    }
  }
}

// Run the setup
setupTestData().catch(console.error); 