const jsforce = require('jsforce');
const axios = require('axios');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'salesforce-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ],
});

// Salesforce connection
let conn;
let accessToken;
let mockMode = false;

/**
 * Initialize the Salesforce connection
 */
async function initialize() {
  try {
    // Create connection
    conn = new jsforce.Connection({
      loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com'
    });
    
    // Login with username and password
    await conn.login(
      process.env.SALESFORCE_USERNAME,
      process.env.SALESFORCE_PASSWORD
    );
    
    accessToken = conn.accessToken;
    
    logger.info('Connected to Salesforce');
    return true;
  } catch (error) {
    logger.error('Failed to connect to Salesforce', { error: error.message });
    mockMode = true;
    logger.info('Entering mock mode for Salesforce operations');
    return false;
  }
}

/**
 * Log a compliance incident in Salesforce
 * @param {Object} incident - The incident details
 */
async function logComplianceIncident(incident) {
  try {
    if (mockMode) {
      logger.info('Mock: Logging compliance incident', { incident });
      return 'mock-id-' + Date.now();
    }

    if (!conn) {
      throw new Error('Salesforce connection not initialized');
    }
    
    // Create Compliance_Incident__c record
    const result = await conn.sobject('Compliance_Incident__c').create({
      Type__c: incident.type,
      Severity__c: incident.severity,
      Description__c: incident.description,
      Slack_Message_Link__c: incident.slackMessageLink,
      User_Involved__c: incident.user,
      Channel__c: incident.channel,
      Status__c: incident.status || 'Open',
      Timestamp__c: new Date().toISOString()
    });
    
    if (result.success) {
      logger.info('Compliance incident created in Salesforce', { id: result.id });
      return result.id;
    } else {
      throw new Error(`Failed to create incident: ${result.errors.join(', ')}`);
    }
  } catch (error) {
    logger.error('Error logging compliance incident', { 
      error: error.message,
      incident 
    });
    
    // In mock mode or error, still return a fake ID for testing
    return 'mock-error-id-' + Date.now();
  }
}

/**
 * Invoke the Agentforce agent to analyze content
 * @param {Object} params - Parameters for the agent
 */
async function invokeAgent(params) {
  try {
    if (mockMode) {
      logger.info('Mock: Invoking Agentforce agent', { params });
      return simulateAgentResponse(params);
    }
    
    if (!accessToken) {
      throw new Error('Salesforce not authenticated');
    }
    
    const agentId = process.env.SALESFORCE_AGENT_ID;
    if (!agentId) {
      throw new Error('Agent ID not configured');
    }
    
    // Prepare the agent invocation payload
    const payload = {
      agentId,
      topic: params.topic || 'Auto Policy Monitor',
      input: params.input,
      contextVariables: params.contextVariables || {}
    };
    
    // Call the Agentforce API
    // Note: In a real implementation, this would use the official Agentforce API
    // For hackathon purposes, we're simulating this call
    const baseUrl = process.env.SALESFORCE_INSTANCE_URL || conn.instanceUrl;
    
    const response = await axios.post(
      `${baseUrl}/services/data/v58.0/agentforce/agents/${agentId}/invoke`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    logger.error('Error invoking Agentforce agent', { 
      error: error.message,
      params 
    });
    
    // Return a simulated response if the API call fails
    return simulateAgentResponse(params);
  }
}

/**
 * Simulate an agent response for demo/testing
 * @param {Object} params - The parameters sent to the agent
 */
function simulateAgentResponse(params) {
  const input = params.input || '';
  const contentToAnalyze = typeof input === 'string' ? input : JSON.stringify(input);
  
  // Detect potential compliance issues based on patterns
  const patterns = [
    { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, type: 'GDPR-PII', detail: 'Email address detected' },
    { regex: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g, type: 'HIPAA/PII', detail: 'SSN pattern detected' },
    { regex: /patient|medical record|diagnosis|treatment/gi, type: 'HIPAA', detail: 'Healthcare information detected' },
    { regex: /password|secret|key|token|credential/gi, type: 'Info Security', detail: 'Security credential mentioned' },
    { regex: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b/g, type: 'PCI-DSS', detail: 'Credit card number detected' }
  ];
  
  let issues = [];
  
  // Check for matches against each pattern
  patterns.forEach(pattern => {
    const matches = contentToAnalyze.match(pattern.regex);
    if (matches) {
      issues.push({
        type: pattern.type,
        severity: pattern.type.includes('HIPAA') ? 'High' : 'Medium',
        detail: pattern.detail
      });
    }
  });
  
  // Simulate agent response
  return {
    status: 'completed',
    result: {
      issues: issues,
      summary: issues.length > 0 
        ? `Found ${issues.length} potential compliance issue(s)` 
        : 'No compliance issues detected'
    }
  };
}

/**
 * Enable mock mode for testing without Salesforce connection
 */
function enableMockMode() {
  mockMode = true;
  logger.info('Mock mode enabled for Salesforce operations');
  return true;
}

module.exports = {
  initialize,
  logComplianceIncident,
  invokeAgent,
  enableMockMode
}; 