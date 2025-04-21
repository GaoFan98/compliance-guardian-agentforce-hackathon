const { OpenAI } = require('openai');
const dotenv = require('dotenv');
const winston = require('winston');

dotenv.config();

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'openai-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ],
});

class OpenAIService {
  constructor() {
    this.client = null;
    this.mockMode = false;
    this.initialize();
  }

  initialize() {
    try {
      if (process.env.OPENAI_API_KEY) {
        this.client = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        logger.info('OpenAI client initialized');
      } else {
        logger.warn('OPENAI_API_KEY not found, OpenAI service will use mock mode');
        this.mockMode = true;
      }
    } catch (error) {
      logger.error('Error initializing OpenAI client', { error: error.message });
      this.mockMode = true;
    }
  }

  enableMockMode() {
    this.mockMode = true;
    logger.info('OpenAI service running in mock mode');
  }

  disableMockMode() {
    if (process.env.OPENAI_API_KEY) {
      this.mockMode = false;
      logger.info('OpenAI service running in live mode');
    } else {
      logger.warn('Cannot disable mock mode: OPENAI_API_KEY not found');
    }
  }

  async analyzeComplianceIssues(content) {
    // If in mock mode, return mock results instead of calling OpenAI
    if (this.mockMode) {
      logger.info('Mock: Analyzing content for compliance issues');
      return this.generateMockResults(content);
    }

    try {
      if (!this.client) {
        throw new Error('OpenAI client not initialized');
      }

      const prompt = this.buildCompliancePrompt(content);
      
      logger.info('Calling OpenAI API for compliance analysis', { contentLength: content.length });
      
      const response = await this.client.chat.completions.create({
        model: "gpt-4o",  // or use "gpt-3.5-turbo" for lower cost
        messages: [
          { role: "system", content: "You are a compliance detection system specializing in identifying sensitive information in text content." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1, // Low temperature for more deterministic outputs
      });

      const result = JSON.parse(response.choices[0].message.content);
      logger.info('OpenAI compliance analysis completed', { 
        contentLength: content.length,
        issuesFound: result.issues.length 
      });
      
      return result.issues;
    } catch (error) {
      logger.error('Error analyzing content with OpenAI', { error: error.message });
      throw error;
    }
  }

  buildCompliancePrompt(content) {
    return `
Analyze the following content for compliance issues related to:
1. HIPAA (healthcare information)
2. PCI-DSS (payment card information)
3. Security Credentials (passwords, API keys, tokens)
4. GDPR-PII (personally identifiable information)

Content to analyze:
---
${content}
---

For each issue you detect, provide the following information in your analysis:
- type: The category of the issue (HIPAA, PCI-DSS, Security-Credentials, or GDPR-PII)
- severity: The severity of the issue (Medium, High, or Critical)
- detail: A specific description of what was detected

Return your findings as a JSON object with this format:
{
  "issues": [
    {
      "type": "type-of-issue",
      "severity": "severity-level",
      "detail": "description-of-detected-issue"
    }
  ]
}

If no issues are found, return an empty issues array.
Use these severity guidelines:
- Critical: For PCI-DSS and security credentials
- High: For HIPAA
- Medium: For GDPR-PII

Be thorough but avoid false positives.
`;
  }

  generateMockResults(content) {
    // Simple mock implementation that checks for keywords
    const issues = [];
    
    if (content.toLowerCase().includes('patient') || content.toLowerCase().includes('medical') || content.toLowerCase().includes('health')) {
      issues.push({
        type: 'HIPAA',
        severity: 'High',
        detail: 'Healthcare information detected'
      });
    }
    
    if (content.toLowerCase().includes('credit card') || content.toLowerCase().includes('visa') || content.toLowerCase().includes('mastercard')) {
      issues.push({
        type: 'PCI-DSS',
        severity: 'Critical',
        detail: 'Credit card information detected'
      });
    }
    
    if (content.toLowerCase().includes('password') || content.toLowerCase().includes('api key') || content.toLowerCase().includes('token')) {
      issues.push({
        type: 'Security-Credentials',
        severity: 'Critical',
        detail: 'Security credential detected'
      });
    }
    
    if (content.toLowerCase().includes('email') || content.toLowerCase().includes('@') || content.toLowerCase().includes('address')) {
      issues.push({
        type: 'GDPR-PII',
        severity: 'Medium',
        detail: 'Email address or personal information detected'
      });
    }
    
    return issues;
  }
}

module.exports = new OpenAIService(); 