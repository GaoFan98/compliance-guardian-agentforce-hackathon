/**
 * Compliance Auditor Agent - Slack Event Handler
 * 
 * REST endpoint to handle incoming events from Slack
 */
@RestResource(urlMapping='/slack/events/*')
global class SlackEventHandler {
    
    /**
     * Handle POST requests from Slack
     */
    @HttpPost
    global static void doPost() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;
        
        try {
            // Get the request body
            String requestBody = req.requestBody.toString();
            Map<String, Object> requestData = (Map<String, Object>) JSON.deserializeUntyped(requestBody);
            
            // Handle Slack URL verification challenge
            if (requestData.containsKey('challenge')) {
                handleUrlVerification(requestData, res);
                return;
            }
            
            // Verify Slack request signature (in production, implement proper verification)
            // For hackathon, we're simplifying this step
            
            // Process different event types
            String eventType = (String) requestData.get('type');
            
            if (eventType == 'event_callback') {
                handleEventCallback(requestData, res);
            } else if (eventType == 'command') {
                handleCommandCallback(requestData, res);
            } else {
                // Unknown event type
                res.statusCode = 400;
                res.responseBody = Blob.valueOf('Unsupported event type');
            }
        } catch (Exception e) {
            System.debug('Error processing Slack event: ' + e.getMessage());
            res.statusCode = 500;
            res.responseBody = Blob.valueOf('Internal server error: ' + e.getMessage());
        }
    }
    
    /**
     * Handle URL verification challenge from Slack
     */
    private static void handleUrlVerification(Map<String, Object> requestData, RestResponse res) {
        String challenge = (String) requestData.get('challenge');
        
        // Respond with the challenge value
        res.statusCode = 200;
        res.addHeader('Content-Type', 'application/json');
        res.responseBody = Blob.valueOf('{"challenge":"' + challenge + '"}');
    }
    
    /**
     * Handle Slack event callbacks
     */
    private static void handleEventCallback(Map<String, Object> requestData, RestResponse res) {
        Map<String, Object> event = (Map<String, Object>) requestData.get('event');
        String eventSubtype = (String) event.get('type');
        
        // Set up variables to hold content and metadata
        String content = '';
        String userId = '';
        String channelId = '';
        String messageTs = '';
        
        // Extract relevant information based on event type
        if (eventSubtype == 'message') {
            // Extract message content and metadata
            content = (String) event.get('text');
            userId = (String) event.get('user');
            channelId = (String) event.get('channel');
            messageTs = (String) event.get('ts');
            
            // Ignore bot messages
            Boolean isBotMessage = event.containsKey('bot_id');
            if (isBotMessage) {
                res.statusCode = 200;
                return;
            }
            
            // Invoke agent to scan message content
            invokeScanAgent(content, userId, channelId, messageTs);
        } else if (eventSubtype == 'app_mention') {
            // Extract mention content and metadata
            content = (String) event.get('text');
            userId = (String) event.get('user');
            channelId = (String) event.get('channel');
            messageTs = (String) event.get('ts');
            
            // Parse the mention to understand what the user wants
            // For simplicity, we'll assume any mention is a request to scan the channel
            invokeAuditAgent(content, userId, channelId, messageTs);
        } else if (eventSubtype == 'file_shared') {
            // Handle file share event - this would require additional API calls to Slack
            // to retrieve the file content, which is beyond the scope of this example
            String fileId = (String) event.get('file_id');
            userId = (String) event.get('user_id');
            channelId = (String) event.get('channel_id');
            
            System.debug('File shared event received. File ID: ' + fileId);
        }
        
        // Acknowledge receipt of the event
        res.statusCode = 200;
    }
    
    /**
     * Handle Slack command callbacks
     */
    private static void handleCommandCallback(Map<String, Object> requestData, RestResponse res) {
        String command = (String) requestData.get('command');
        String text = (String) requestData.get('text');
        String userId = (String) requestData.get('user_id');
        String channelId = (String) requestData.get('channel_id');
        String responseUrl = (String) requestData.get('response_url');
        
        // Handle compliance audit command
        if (command == '/compliance-audit') {
            // Acknowledge receipt immediately
            res.statusCode = 200;
            res.addHeader('Content-Type', 'application/json');
            res.responseBody = Blob.valueOf('{"text":"Running compliance scan, please wait...","response_type":"ephemeral"}');
            
            // Process the command asynchronously
            processComplianceAuditCommand(text, userId, channelId, responseUrl);
        } else {
            // Unknown command
            res.statusCode = 400;
            res.responseBody = Blob.valueOf('Unsupported command');
        }
    }
    
    /**
     * Invoke agent to scan message content
     */
    @future(callout=true)
    private static void invokeScanAgent(String content, String userId, String channelId, String messageTs) {
        try {
            // Use our custom Apex action to scan content
            List<ComplianceActions.ScanResult> results = ComplianceActions.scanContentForCompliance(new List<String>{content});
            
            if (!results.isEmpty() && results[0].hasIssues) {
                ComplianceActions.ScanResult result = results[0];
                
                // Log incidents for each issue found
                for (ComplianceActions.ComplianceIssue issue : result.issues) {
                    ComplianceActions.ComplianceIncidentRequest incident = new ComplianceActions.ComplianceIncidentRequest();
                    incident.type = issue.type;
                    incident.severity = issue.severity;
                    incident.description = 'Detected ' + issue.type + ' in Slack message: ' + issue.detail;
                    incident.slackMessageLink = 'https://slack.com/archives/' + channelId + '/p' + messageTs.replace('.', '');
                    incident.user = userId;
                    incident.channel = channelId;
                    incident.status = 'Open';
                    
                    ComplianceActions.logComplianceIncident(new List<ComplianceActions.ComplianceIncidentRequest>{incident});
                }
                
                // Notify user via Slack - in production, we would use Slack API here
                System.debug('Compliance issues detected: ' + result.summary);
                
                // In a real implementation, we would call the Slack API to send a DM to the user
                // For hackathon purposes, we'll just log the notification
                System.debug('Would send DM to user ' + userId + ' about compliance issues');
            }
        } catch (Exception e) {
            System.debug('Error in invokeScanAgent: ' + e.getMessage());
        }
    }
    
    /**
     * Invoke agent to process audit request
     */
    @future(callout=true)
    private static void invokeAuditAgent(String content, String userId, String channelId, String messageTs) {
        try {
            // For a real implementation, this would invoke the Agentforce agent for audit
            // For hackathon purposes, we'll simulate the response
            
            // Extract the type of scan requested from the mention
            String scanType = 'general';
            if (content.toLowerCase().contains('gdpr')) {
                scanType = 'GDPR';
            } else if (content.toLowerCase().contains('hipaa')) {
                scanType = 'HIPAA';
            }
            
            // Simulate scanning channel history
            String response = 'I\'ve completed scanning this channel for ' + scanType + ' compliance issues.\n\n';
            
            // Generate a fake response for demonstration
            Boolean foundIssues = Math.mod(Datetime.now().millisecond(), 2) == 0; // Random result
            
            if (foundIssues) {
                response += ':warning: I found potential compliance issues:\n\n';
                response += '* ' + scanType + '-PII: 2 instance(s)\n';
                response += '* Security Credentials: 1 instance(s)\n\n';
                response += 'Please review these messages and take appropriate action.';
            } else {
                response += ':white_check_mark: No ' + scanType + ' compliance issues found in this channel.';
            }
            
            // In a real implementation, we would call the Slack API to respond in the thread
            System.debug('Would reply in thread ' + messageTs + ' with: ' + response);
        } catch (Exception e) {
            System.debug('Error in invokeAuditAgent: ' + e.getMessage());
        }
    }
    
    /**
     * Process compliance audit command asynchronously
     */
    @future(callout=true)
    private static void processComplianceAuditCommand(String text, String userId, String channelId, String responseUrl) {
        try {
            // For a real implementation, this would invoke the Agentforce agent for audit
            // For hackathon purposes, we'll simulate the response
            
            // Generate a response based on the command
            String response = 'I\'ve completed the compliance audit.\n\n';
            
            // Generate a fake response for demonstration
            Boolean foundIssues = Math.mod(Datetime.now().millisecond(), 3) == 0; // Random result
            
            if (foundIssues) {
                response += ':warning: I found potential compliance issues:\n\n';
                response += '* GDPR-PII: 1 instance(s)\n';
                response += '* HIPAA: 1 instance(s)\n\n';
                response += 'Please review these messages and take appropriate action.';
            } else {
                response += ':white_check_mark: No compliance issues found in this channel.';
            }
            
            // In a real implementation, we would call the Slack API to send the response
            // For hackathon purposes, we'll just log the response
            System.debug('Would send response to ' + responseUrl + ': ' + response);
        } catch (Exception e) {
            System.debug('Error in processComplianceAuditCommand: ' + e.getMessage());
        }
    }
} 