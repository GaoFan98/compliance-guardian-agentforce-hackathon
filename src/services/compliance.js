const salesforceService = require('./salesforce');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'compliance-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ],
});

/**
 * Scan content for compliance issues
 * @param {string} content - The content to scan
 * @returns {Array} Array of detected issues
 */
async function scanContent(content) {
  try {
    if (!content) return [];
    
    // Call the Agentforce agent through Salesforce service
    const agentResponse = await salesforceService.invokeAgent({
      topic: 'Auto Policy Monitor',
      input: content
    });
    
    // Extract issues from agent response
    if (agentResponse && agentResponse.result && agentResponse.result.issues) {
      return agentResponse.result.issues;
    }
    
    return [];
  } catch (error) {
    logger.error('Error scanning content', { error: error.message });
    
    // Fallback to local scan if agent fails
    logger.info('Falling back to local scanning');
    return scanContentLocally(content);
  }
}

/**
 * Local fallback for content scanning
 * @param {string} content - The content to scan
 * @returns {Array} Array of detected issues
 */
function scanContentLocally(content) {
  // Define patterns for different compliance issues
  const patterns = [
    { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, type: 'GDPR-PII', detail: 'Email address detected', severity: 'Medium' },
    { regex: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g, type: 'HIPAA/PII', detail: 'SSN pattern detected', severity: 'High' },
    { regex: /patient|medical record|diagnosis|treatment|health record|medication|health|doctor/gi, type: 'HIPAA', detail: 'Healthcare information detected', severity: 'High' },
    { regex: /password|secret|key|token|credential|api key|private key|access key|ssh key/gi, type: 'Security-Credentials', detail: 'Security credential detected', severity: 'Critical' },
    // Improved credit card regex that matches patterns in our test files
    { regex: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b|credit card|card number|cvv|exp date|expiration date|card verification/gi, type: 'PCI-DSS', detail: 'Credit card information detected', severity: 'Critical' },
    { regex: /confidential|top secret|internal only|do not share/gi, type: 'Internal Policy', detail: 'Confidential information marker detected', severity: 'Medium' }
  ];
  
  let issues = [];
  
  // Check for matches against each pattern
  patterns.forEach(pattern => {
    const matches = content.match(pattern.regex);
    if (matches) {
      issues.push({
        type: pattern.type,
        severity: pattern.severity,
        detail: pattern.detail
      });
    }
  });
  
  return issues;
}

/**
 * Process a compliance audit command
 * @param {Object} command - The Slack command object
 * @returns {string} Response message
 */
async function processAuditCommand(command) {
  try {
    const channelId = command.channel_id;
    const text = command.text || '';
    
    // Default to current channel if no target specified
    let targetType = 'channel';
    let targetId = channelId;
    
    // Check if a specific target was provided
    if (text) {
      // User mentioned another channel
      if (text.includes('<#')) {
        const match = text.match(/<#([A-Z0-9]+)(?:\|.+)?>/);
        if (match && match[1]) {
          targetId = match[1];
        }
      } 
      // User mentioned a file
      else if (text.includes('file')) {
        targetType = 'file';
        // We'd need to parse the file ID or handle this differently
        // For demo, we'll just acknowledge
        return "File scanning is not implemented for direct command yet. Try uploading a file to trigger automatic scanning.";
      }
      // User mentioned another user
      else if (text.includes('<@')) {
        targetType = 'user';
        const match = text.match(/<@([A-Z0-9]+)(?:\|.+)?>/);
        if (match && match[1]) {
          targetId = match[1];
        } else {
          return "I couldn't recognize the user to scan. Please try again with a valid @mention.";
        }
      }
    }
    
    // Call Agentforce to process the scan
    const agentResponse = await salesforceService.invokeAgent({
      topic: 'Manual Compliance Audit',
      input: {
        command: 'audit',
        targetType,
        targetId
      },
      contextVariables: {
        channelId,
        userId: command.user_id
      }
    });
    
    // Format the response
    if (agentResponse && agentResponse.result) {
      const result = agentResponse.result;
      
      if (result.issues && result.issues.length > 0) {
        return formatIssuesResponse(result.issues, targetType, targetId);
      } else {
        return `:white_check_mark: No compliance issues found in the ${targetType}.`;
      }
    }
    
    return "I've completed the scan but couldn't generate a detailed report. Please try again later.";
  } catch (error) {
    logger.error('Error processing audit command', { error: error.message });
    return `There was an error processing your request: ${error.message}`;
  }
}

/**
 * Process a compliance audit mention
 * @param {Object} event - The Slack event object
 * @returns {string} Response message
 */
async function processAuditMention(event) {
  try {
    const channelId = event.channel;
    const messageText = event.text;
    
    // Extract what kind of scan is requested
    let scanType = 'general';
    if (messageText.toLowerCase().includes('gdpr')) {
      scanType = 'GDPR';
    } else if (messageText.toLowerCase().includes('hipaa')) {
      scanType = 'HIPAA';
    } else if (messageText.toLowerCase().includes('pci')) {
      scanType = 'PCI-DSS';
    } else if (messageText.toLowerCase().includes('security')) {
      scanType = 'Info Security';
    }
    
    // Call Agentforce
    const agentResponse = await salesforceService.invokeAgent({
      topic: 'Manual Compliance Audit',
      input: {
        command: 'audit',
        targetType: 'channel',
        targetId: channelId,
        scanType
      },
      contextVariables: {
        channelId,
        userId: event.user
      }
    });
    
    // Format the response
    if (agentResponse && agentResponse.result) {
      const result = agentResponse.result;
      
      if (result.issues && result.issues.length > 0) {
        return formatIssuesResponse(result.issues, 'channel', channelId);
      } else {
        return `:white_check_mark: No ${scanType} compliance issues found in this channel.`;
      }
    }
    
    return "I've completed the scan but couldn't generate a detailed report. Please try again later.";
  } catch (error) {
    logger.error('Error processing audit mention', { error: error.message });
    return `There was an error processing your request: ${error.message}`;
  }
}

/**
 * Format a response for compliance issues
 * @param {Array} issues - Array of issues found
 * @param {string} targetType - Type of target (channel, user, file)
 * @param {string} targetId - ID of the target
 * @returns {string} Formatted response
 */
function formatIssuesResponse(issues, targetType, targetId) {
  const target = targetType === 'channel' ? `<#${targetId}>` : 
                 targetType === 'user' ? `<@${targetId}>` : 
                 'the file';
  
  let response = `:warning: I found ${issues.length} potential compliance issue(s) in ${target}:\n\n`;
  
  // Group issues by type
  const issuesByType = issues.reduce((acc, issue) => {
    acc[issue.type] = acc[issue.type] || [];
    acc[issue.type].push(issue);
    return acc;
  }, {});
  
  // Format each type of issue
  Object.keys(issuesByType).forEach(type => {
    const typeIssues = issuesByType[type];
    response += `*${type}*: ${typeIssues.length} issue(s)\n`;
    response += `- ${typeIssues[0].detail}\n`;
    
    // If there are multiple issues of the same type, mention the count
    if (typeIssues.length > 1) {
      response += `- And ${typeIssues.length - 1} more similar issue(s)\n`;
    }
  });
  
  response += "\nPlease review and address these compliance concerns. Remember that sharing sensitive information in public channels may violate company policy or regulations.";
  
  return response;
}

module.exports = {
  scanContent,
  processAuditCommand,
  processAuditMention
}; 