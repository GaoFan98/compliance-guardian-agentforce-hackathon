const { App } = require('@slack/bolt');
const dotenv = require('dotenv');
const winston = require('winston');
const salesforceService = require('./services/salesforce');
const openaiService = require('./services/openai');
const complianceService = require('./services/compliance');

// Load environment variables
dotenv.config();

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'compliance-auditor' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ],
});

// Initialize the Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: false,
});

// Enable mock mode based on environment variable
const ENABLE_MOCK_MODE = process.env.ENABLE_MOCK_MODE === 'true';

// For hackathon testing, we'll use mock mode if enabled
if (ENABLE_MOCK_MODE) {
  logger.info('Starting in mock mode for testing');
  salesforceService.enableMockMode();
  openaiService.enableMockMode();
} else {
  logger.info('Starting in live mode');
  // Using environment variables to determine which service to use
  if (process.env.USE_SALESFORCE === 'true') {
    logger.info('Salesforce integration enabled');
  }
  if (process.env.USE_OPENAI === 'true') {
    logger.info('OpenAI integration enabled');
  }
}

// Handle slash commands
app.command('/compliance-audit', async ({ command, ack, respond }) => {
  try {
    // Acknowledge command request
    await ack();
    
    // Send immediate response
    await respond({
      text: "Running compliance scan, please wait...",
      response_type: 'ephemeral'
    });
    
    // Process the command
    const result = await complianceService.processAuditCommand(command);
    
    // Send final response
    await respond({
      text: result,
      response_type: 'ephemeral'
    });
  } catch (error) {
    logger.error('Error handling compliance-audit command', { 
      error: error.message,
      command 
    });
    
    await respond({
      text: "Sorry, there was an error processing your request. Please try again later.",
      response_type: 'ephemeral'
    });
  }
});

// Handle mentions
app.event('app_mention', async ({ event, say }) => {
  try {
    const messageText = event.text;
    
    // Check if this is a compliance scan request
    if (messageText.toLowerCase().includes('scan') || 
        messageText.toLowerCase().includes('audit') ||
        messageText.toLowerCase().includes('check')) {
      
      await say({
        text: "I'm analyzing this channel for compliance issues...",
        thread_ts: event.ts
      });
      
      const result = await complianceService.processAuditMention(event);
      
      await say({
        text: result,
        thread_ts: event.ts
      });
    } else {
      // General question or command
      await say({
        text: "Hello! I'm the Compliance Auditor. You can ask me to scan channels or files for compliance issues, or ask questions about compliance policies.",
        thread_ts: event.ts
      });
    }
  } catch (error) {
    logger.error('Error handling app_mention event', { 
      error: error.message,
      event 
    });
    
    await say({
      text: "Sorry, I encountered an error while processing your request.",
      thread_ts: event.ts
    });
  }
});

// Monitor messages in channels
app.event('message', async ({ event, client }) => {
  try {
    // Ignore bot messages and thread replies
    if (event.bot_id || event.thread_ts) return;
    
    // Check message for compliance issues
    const issues = await complianceService.scanContent(event.text);
    
    // If issues found, notify user and log incident
    if (issues && issues.length > 0) {
      try {
        // Get user info
        const userInfo = await client.users.info({ user: event.user });
        
        // Create a more specific message based on the type of issue
        let messageText = `Hello ${userInfo.user.real_name || 'there'}, I noticed you shared something in <#${event.channel}> that might contain sensitive information: ${issues.map(i => i.type).join(', ')}. `;
        
        // Add specifics based on detected issue type
        const mainIssue = issues[0]; // Use the first issue as the main one for detailed messaging
        
        if (mainIssue.type.includes('HIPAA')) {
          messageText += `Healthcare information is protected under HIPAA regulations and requires special handling. `;
        } else if (mainIssue.type.includes('GDPR') || mainIssue.type.includes('PII')) {
          messageText += `Personal identifiable information is protected under privacy regulations like GDPR. `;
        } else if (mainIssue.type.includes('PCI')) {
          messageText += `Payment card information must be handled according to PCI-DSS standards. `;
        } else if (mainIssue.type.includes('Security')) {
          messageText += `Sharing credentials or secrets in chat channels poses a significant security risk. `;
        }
        
        messageText += `Severity: ${mainIssue.severity}. `;
        
        if (issues.length > 1) {
          messageText += `(${issues.length - 1} additional issue types also detected) `;
        }
        
        messageText += `Please be careful about sharing such information in public channels.`;
        
        // DM the user
        client.chat.postMessage({
          channel: event.user,
          text: messageText
        }).catch(err => {
          logger.error('Error sending notification message', { error: err.message });
        });
        
        // Log incident in Salesforce
        await salesforceService.logComplianceIncident({
          type: issues[0].type,
          severity: issues[0].severity,
          description: `Detected ${issues[0].type} in channel <#${event.channel}>`,
          slackMessageLink: `https://slack.com/archives/${event.channel}/p${event.ts.replace('.', '')}`,
          user: event.user,
          channel: event.channel,
          status: 'Open'
        });
        
        logger.info('Compliance issue detected and notification sent', {
          channel: event.channel,
          user: event.user,
          issueTypes: issues.map(i => i.type)
        });
      } catch (err) {
        logger.error('Error sending notification', { error: err.message });
      }
    }
  } catch (error) {
    logger.error('Error handling message event', { 
      error: error.message,
      event 
    });
  }
});

// Monitor file uploads
app.event('file_shared', async ({ event, client }) => {
  try {
    // Get file info
    const fileInfo = await client.files.info({ file: event.file_id });
    logger.info('File shared', { fileName: fileInfo.file.name, fileType: fileInfo.file.mimetype });
    
    // Extract user ID directly from event or from fileInfo
    const userId = event.user_id || fileInfo.file.user || event.user;
    const channelId = event.channel_id || fileInfo.file.channels[0];
    
    logger.info('Processing file share', { userId, channelId, fileName: fileInfo.file.name });
    
    // Currently only scan text files
    if (fileInfo.file.mimetype.includes('text') || 
        fileInfo.file.mimetype.includes('csv') || 
        fileInfo.file.mimetype.includes('json') ||
        fileInfo.file.mimetype.includes('plain')) {
      
      try {
        // Get a public URL for the file (or private download URL with token)
        let fileContent = '';
        
        // If file has a public URL or permalink
        if (fileInfo.file.url_private) {
          logger.info('Downloading file content', { url: fileInfo.file.url_private });
          
          // Download the file content using axios with Slack token for auth
          const axios = require('axios');
          const response = await axios.get(fileInfo.file.url_private, {
            headers: {
              'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
            }
          });
          
          fileContent = response.data;
          logger.info('File content downloaded', { contentLength: fileContent.length });
        } else {
          logger.info('No URL available to download file');
          fileContent = `Filename: ${fileInfo.file.name}`;  // Fallback to just using filename
        }
        
        // Scan the content for compliance issues
        let issues = [];
        
        // First, check the file content using our compliance service
        const contentIssues = await complianceService.scanContent(fileContent);
        if (contentIssues && contentIssues.length > 0) {
          issues = [...contentIssues];
        }
        
        // As a fallback, also check the filename for obvious markers
        const fileName = fileInfo.file.name.toLowerCase();
        if (fileName.includes('patient') || fileName.includes('medical') || fileName.includes('health')) {
          // Only add if not already detected in content
          if (!issues.some(i => i.type === 'HIPAA')) {
            issues.push({ type: 'HIPAA', severity: 'High', detail: 'Potential patient data in file name' });
          }
        } else if (fileName.includes('customer') || fileName.includes('personal') || fileName.includes('email')) {
          // Only add if not already detected in content
          if (!issues.some(i => i.type.includes('GDPR'))) {
            issues.push({ type: 'GDPR-PII', severity: 'Medium', detail: 'Potential personal data in file name' });
          }
        }
        
        if (issues.length > 0) {
          logger.info('Compliance issues detected in file content', { issues });
          
          // Determine issue types present - properly categorize all issues
          const hasHIPAA = issues.some(i => i.type === 'HIPAA' || i.detail.toLowerCase().includes('healthcare'));
          const hasPCI = issues.some(i => i.type.includes('PCI') || i.detail.toLowerCase().includes('credit card'));
          const hasSecurity = issues.some(i => i.type.includes('Security') || i.detail.toLowerCase().includes('password') || i.detail.toLowerCase().includes('credential'));
          const hasPII = issues.some(i => i.type.includes('PII') || i.type.includes('GDPR') || i.detail.toLowerCase().includes('email'));
          
          // Determine severity based on combination of issues - highest severity takes precedence
          let severity = "Medium";
          if (hasPCI || hasSecurity) {
            severity = "Critical";
          } else if (hasHIPAA) {
            severity = "High";
          }
          
          // Create a more specific and detailed message based on all detected issue types
          let messageText = `Hello, I noticed you shared a file "${fileInfo.file.name}" that contains sensitive information. `;
          
          // Build a more specific message based on exactly what was found
          let detailsText = [];
          if (hasHIPAA) {
            detailsText.push(`healthcare information (HIPAA regulated data)`);
          }
          if (hasPCI) {
            detailsText.push(`payment card information (PCI-DSS regulated data)`);
          }
          if (hasSecurity) {
            detailsText.push(`security credentials or passwords`);
          }
          if (hasPII && !(hasHIPAA || hasPCI || hasSecurity)) {
            // Only mention PII separately if it's the only issue type
            detailsText.push(`personally identifiable information (PII protected under privacy regulations)`);
          } else if (hasPII) {
            // Otherwise add it as an additional concern
            detailsText.push(`other personal data`);
          }
          
          // Format the details text nicely
          if (detailsText.length === 1) {
            messageText += `This file contains ${detailsText[0]}. `;
          } else if (detailsText.length === 2) {
            messageText += `This file contains ${detailsText[0]} and ${detailsText[1]}. `;
          } else if (detailsText.length > 2) {
            const lastItem = detailsText.pop();
            messageText += `This file contains ${detailsText.join(', ')}, and ${lastItem}. `;
          }
          
          // List all detected issue details
          messageText += `Specifically detected: ${issues.map(i => i.detail).join(', ')}. `;
          messageText += `Overall severity: ${severity}. `;
          
          // Add specific compliance advice based on the combination of issues
          if (hasHIPAA) {
            messageText += `Healthcare data must be encrypted and only shared with authorized personnel under HIPAA regulations. `;
          }
          if (hasPCI) {
            messageText += `Payment card information must be encrypted and handled according to PCI-DSS requirements. `;
          }
          if (hasSecurity) {
            messageText += `Please revoke and rotate any credentials that may have been exposed immediately. `;
          }
          if (hasPII) {
            messageText += `Please ensure you have appropriate consent and data processing agreements in place for personal data. `;
          }
          
          messageText += `Please ensure this file is properly secured and only shared with authorized personnel.`;
          
          // Notify user
          client.chat.postMessage({
            channel: userId,
            text: messageText
          }).catch(err => {
            logger.error('Error sending notification message', { error: err.message });
          });
          
          // Log incident with all issue types detected
          // Create a combined type for logging that reflects all issues
          let combinedType = "";
          if (hasHIPAA) combinedType += "HIPAA ";
          if (hasPCI) combinedType += "PCI-DSS ";
          if (hasSecurity) combinedType += "Security-Credentials ";
          if (hasPII) combinedType += "GDPR-PII ";
          combinedType = combinedType.trim() || issues[0].type;
          
          await salesforceService.logComplianceIncident({
            type: combinedType,
            severity: severity,
            description: `Detected multiple compliance issues in file "${fileInfo.file.name}" - ${issues.map(i => i.detail).join(', ')}`,
            slackMessageLink: fileInfo.file.permalink,
            user: userId,
            channel: channelId,
            status: 'Open'
          });
        } else {
          logger.info('No compliance issues detected in file content');
        }
      } catch (downloadErr) {
        logger.error('Error downloading or processing file content', { error: downloadErr.message });
        // Even if download fails, still check the filename as fallback
        checkFilenameOnly();
      }
    } else {
      // For non-text files, just check the filename
      checkFilenameOnly();
    }
    
    // Helper function to check just the filename when we can't scan content
    function checkFilenameOnly() {
      const fileName = fileInfo.file.name.toLowerCase();
      let issues = [];
      
      if (fileName.includes('patient') || fileName.includes('medical') || fileName.includes('health')) {
        issues.push({ type: 'HIPAA', severity: 'High', detail: 'Potential patient data in file name' });
      } else if (fileName.includes('credit') || fileName.includes('card') || fileName.includes('payment')) {
        issues.push({ type: 'PCI-DSS', severity: 'Critical', detail: 'Potential payment card data in file name' });
      } else if (fileName.includes('password') || fileName.includes('secret') || fileName.includes('credential')) {
        issues.push({ type: 'Security-Credentials', severity: 'Critical', detail: 'Potential security credentials in file name' });
      } else if (fileName.includes('customer') || fileName.includes('personal') || fileName.includes('email')) {
        issues.push({ type: 'GDPR-PII', severity: 'Medium', detail: 'Potential personal data in file name' });
      }
      
      if (issues.length > 0) {
        try {
          // Determine primary issue type based on severity
          let primaryIssue = issues.reduce((prev, current) => {
            const severityRank = { 'Low': 0, 'Medium': 1, 'High': 2, 'Critical': 3 };
            return (severityRank[current.severity] > severityRank[prev.severity]) ? current : prev;
          }, issues[0]);
          
          // Create notification based on filename only
          let messageText = `Hello, I noticed you shared a file "${fileInfo.file.name}" with a name that suggests it might contain sensitive information. `;
          
          // Add specific message based on issue type
          if (primaryIssue.type === 'HIPAA') {
            messageText += `The filename suggests it may contain healthcare or patient information that falls under HIPAA regulations. `;
          } else if (primaryIssue.type === 'PCI-DSS') {
            messageText += `The filename suggests it may contain payment card information that falls under PCI-DSS standards. `;
          } else if (primaryIssue.type === 'Security-Credentials') {
            messageText += `The filename suggests it may contain security credentials or secrets. `;
          } else if (primaryIssue.type === 'GDPR-PII') {
            messageText += `The filename suggests it may contain personal data that falls under GDPR regulations. `;
          }
          
          messageText += `I couldn't scan the file contents because it's not a supported file type, but please be cautious with files that may contain regulated data. `;
          messageText += `Severity: ${primaryIssue.severity}. `;
          messageText += `Please ensure this file is properly secured and only shared with authorized personnel.`;
          
          // Notify user
          client.chat.postMessage({
            channel: userId,
            text: messageText
          }).catch(err => {
            logger.error('Error sending notification message', { error: err.message });
          });
          
          // Log incident
          salesforceService.logComplianceIncident({
            type: primaryIssue.type,
            severity: primaryIssue.severity,
            description: `Detected potential ${primaryIssue.type} based on file name "${fileInfo.file.name}"`,
            slackMessageLink: fileInfo.file.permalink,
            user: userId,
            channel: channelId,
            status: 'Open'
          });
          
          logger.info('Compliance issue detected from filename', {
            fileName: fileInfo.file.name,
            user: userId,
            issueTypes: issues.map(i => i.type)
          });
        } catch (err) {
          logger.error('Error handling file notification', { error: err.message });
        }
      }
    }
  } catch (error) {
    logger.error('Error handling file_shared event', { 
      error: error.message,
      event 
    });
  }
});

// Start the app
(async () => {
  const port = process.env.PORT || 3000;
  await app.start(port);
  logger.info(`⚡️ Compliance Auditor app is running on port ${port}`);
})(); 