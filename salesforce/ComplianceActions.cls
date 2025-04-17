/**
 * Compliance Auditor Agent - Custom Actions
 * 
 * This class contains actions for the Agentforce Compliance Auditor agent to perform
 * compliance scans and log incidents.
 */
global class ComplianceActions {
    
    /**
     * Scans content for compliance issues
     * 
     * @param content The text content to scan
     * @return A list of compliance issues found
     */
    @InvocableMethod(label='Scan Content for Compliance' description='Analyzes text for potential compliance violations')
    global static List<ScanResult> scanContentForCompliance(List<String> content) {
        List<ScanResult> results = new List<ScanResult>();
        
        if (content == null || content.isEmpty()) {
            return results;
        }
        
        String textToScan = content[0];
        ScanResult result = new ScanResult();
        result.issues = new List<ComplianceIssue>();
        
        // Scan for compliance issues
        scanForPattern(textToScan, '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b', 'GDPR-PII', 'Email address detected', 'Medium', result.issues);
        scanForPattern(textToScan, '\\b\\d{3}[-.*]?\\d{2}[-.*]?\\d{4}\\b', 'HIPAA/PII', 'SSN pattern detected', 'High', result.issues);
        scanForPattern(textToScan, '(?i)patient|medical record|diagnosis|treatment|health record', 'HIPAA', 'Healthcare information detected', 'High', result.issues);
        scanForPattern(textToScan, '(?i)password|secret|key|token|credential|api key', 'Info Security', 'Security credential mentioned', 'High', result.issues);
        scanForPattern(textToScan, '\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\\d{3})\\d{11})\\b', 'PCI-DSS', 'Credit card number detected', 'High', result.issues);
        scanForPattern(textToScan, '(?i)confidential|top secret|internal only|do not share', 'Internal Policy', 'Confidential information marker detected', 'Medium', result.issues);
        
        result.hasIssues = !result.issues.isEmpty();
        result.issueCount = result.issues.size();
        result.summary = result.hasIssues 
            ? 'Found ' + result.issueCount + ' potential compliance issue(s)' 
            : 'No compliance issues detected';
        
        results.add(result);
        return results;
    }
    
    /**
     * Logs a compliance incident in Salesforce
     * 
     * @param incidents The incident details to log
     * @return IDs of the created incidents
     */
    @InvocableMethod(label='Log Compliance Incident' description='Creates a record of a compliance violation')
    global static List<String> logComplianceIncident(List<ComplianceIncidentRequest> incidents) {
        List<String> results = new List<String>();
        
        if (incidents == null || incidents.isEmpty()) {
            return results;
        }
        
        List<Compliance_Incident__c> recordsToInsert = new List<Compliance_Incident__c>();
        
        for (ComplianceIncidentRequest incident : incidents) {
            Compliance_Incident__c record = new Compliance_Incident__c(
                Type__c = incident.type,
                Severity__c = incident.severity,
                Description__c = incident.description,
                Slack_Message_Link__c = incident.slackMessageLink,
                User_Involved__c = incident.user,
                Channel__c = incident.channel,
                Status__c = incident.status,
                Timestamp__c = Datetime.now()
            );
            
            recordsToInsert.add(record);
        }
        
        if (!recordsToInsert.isEmpty()) {
            try {
                insert recordsToInsert;
                
                for (Compliance_Incident__c record : recordsToInsert) {
                    results.add(record.Id);
                }
            } catch (Exception e) {
                System.debug('Error creating compliance incidents: ' + e.getMessage());
                throw e;
            }
        }
        
        return results;
    }
    
    /**
     * Helper method to scan text for a specific pattern
     */
    private static void scanForPattern(String text, String pattern, String issueType, String detail, String severity, List<ComplianceIssue> issues) {
        Pattern p = Pattern.compile(pattern);
        Matcher m = p.matcher(text);
        
        if (m.find()) {
            ComplianceIssue issue = new ComplianceIssue();
            issue.type = issueType;
            issue.detail = detail;
            issue.severity = severity;
            issues.add(issue);
        }
    }
    
    /**
     * Request class for logging compliance incidents
     */
    global class ComplianceIncidentRequest {
        @InvocableVariable(required=true)
        global String type;
        
        @InvocableVariable(required=true)
        global String severity;
        
        @InvocableVariable(required=true)
        global String description;
        
        @InvocableVariable
        global String slackMessageLink;
        
        @InvocableVariable
        global String user;
        
        @InvocableVariable
        global String channel;
        
        @InvocableVariable
        global String status = 'Open';
    }
    
    /**
     * Result class for content scanning
     */
    global class ScanResult {
        @InvocableVariable
        global Boolean hasIssues;
        
        @InvocableVariable
        global Integer issueCount;
        
        @InvocableVariable
        global String summary;
        
        @InvocableVariable
        global List<ComplianceIssue> issues;
    }
    
    /**
     * Class to represent a compliance issue
     */
    global class ComplianceIssue {
        @InvocableVariable
        global String type;
        
        @InvocableVariable
        global String detail;
        
        @InvocableVariable
        global String severity;
    }
} 