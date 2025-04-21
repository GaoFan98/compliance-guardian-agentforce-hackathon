# Compliance Auditor for Slack

A Slack-integrated compliance monitoring application that automatically scans messages and file uploads for sensitive information such as HIPAA-regulated healthcare data, PCI-DSS payment information, security credentials, and GDPR-protected personal data.

## Features

- **Real-time Compliance Scanning**: Monitors Slack messages and file uploads for compliance issues
- **Multiple Detection Methods**: Uses OpenAI's advanced models for primary analysis with regex fallback
- **Smart Issue Classification**: Automatically categorizes issues by type and severity
- **Detailed Notifications**: Provides specific guidance based on the type of sensitive data detected
- **File Type Support**: Analyzes text, CSV, JSON and other plain text formats
- **Comprehensive Reporting**: Tracks all detected issues with severity and context

## Architecture

The application uses a multi-tiered approach to compliance detection:

1. **Primary Detection**: OpenAI GPT models analyze content with contextual understanding
2. **Secondary Detection**: (Optional) Salesforce Agentforce for additional analysis
3. **Fallback Detection**: Local regex-based scanning when other methods are unavailable

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Slack app with appropriate permissions
- OpenAI API key
- Node.js 14+ (for local development)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/compliance-auditor.git
   cd compliance-auditor
   ```

2. Copy and configure the environment variables:
   ```bash
   cp .env.example .env
   ```
   
3. Edit the `.env` file to add your credentials:
   ```
   # Required
   SLACK_BOT_TOKEN=xoxb-your-token-here
   SLACK_SIGNING_SECRET=your-signing-secret-here
   OPENAI_API_KEY=your-openai-api-key-here
   
   # Optional Salesforce integration
   SALESFORCE_LOGIN_URL=https://login.salesforce.com
   SALESFORCE_USERNAME=your-salesforce-username
   SALESFORCE_PASSWORD=your-salesforce-password
   SALESFORCE_AGENT_ID=your-salesforce-agent-id
   
   # Feature flags
   USE_OPENAI=true
   USE_SALESFORCE=false
   ENABLE_MOCK_MODE=false
   ```

4. Build and start the application:
   ```bash
   docker-compose build --no-cache
   docker-compose up -d
   ```

### Slack App Setup

1. Create a new Slack app at https://api.slack.com/apps
2. Add these OAuth scopes:
   - `chat:write`
   - `files:read`
   - `users:read`
   - `channels:history`
3. Enable Event Subscriptions and subscribe to:
   - `file_shared`
   - `message.channels`
4. Set up a public URL with ngrok:
   ```bash
   ngrok http 8000
   ```
5. Use the ngrok URL in your Slack app configuration:
   - Event request URL: `https://your-ngrok-url.ngrok.io/slack/events`

## Configuration Options

### OpenAI Integration

The application leverages OpenAI's GPT models for advanced compliance detection:

- Set `USE_OPENAI=true` to enable OpenAI integration
- Configure the model by modifying `src/services/openai.js`:
  ```javascript
  model: "gpt-4o", // or "gpt-3.5-turbo" for lower cost
  ```
- Customize the prompt by editing the `buildCompliancePrompt` method

### Salesforce Integration (Optional)

For users with Salesforce Agentforce access:

- Set `USE_SALESFORCE=true` to enable Salesforce integration
- Provide Salesforce credentials in the .env file
- The system will use Salesforce as a fallback if OpenAI fails

### Mock Mode

For development and testing:

- Set `ENABLE_MOCK_MODE=true` to use mock responses instead of calling APIs
- This mode simulates detection without using API credits

## How It Works

1. **File Upload Detection**: When a user uploads a file to Slack, the app checks if it's a supported format
2. **Content Extraction**: For supported files, the content is downloaded and analyzed
3. **AI Analysis**: The content is sent to OpenAI for compliance issue detection
4. **Issue Classification**: Detected issues are categorized by type and severity
5. **User Notification**: The user who shared the content receives a direct message
6. **Detailed Guidance**: The notification includes specific advice based on the compliance issues

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the application in development mode:
   ```bash
   npm run dev
   ```

3. For testing specific files:
   ```bash
   node test_scan.js
   ```

## Troubleshooting

### Common Issues

- **Module not found errors**: Run `docker-compose build --no-cache` to ensure all dependencies are installed
- **Slack connection issues**: Verify your ngrok tunnel is running and the URL is updated in Slack
- **OpenAI errors**: Check your API key and rate limits

### Logs

- View application logs:
  ```bash
  docker-compose logs -f
  ```

- Check for specific service logs:
  ```bash
  docker-compose logs -f middleware
  ```

## License

MIT 