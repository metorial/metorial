Now let me check the authentication details more carefully and see if there are two types of tokens.Now I have a comprehensive understanding of Botsonic's API. Let me also check authentication details for the two types of tokens (API Token per bot vs. API Secret Key).I now have enough information to write the specification. There are two authentication mechanisms: a per-bot API Token (obtained from the bot's Integration page) and account-level API Secret Keys (created from the API section in account settings). The API has no webhook/event support based on my research.

# Slates Specification for Botsonic

## Overview

Botsonic is a no-code AI chatbot builder by Writesonic, powered by GPT-4, that allows businesses to create custom chatbots trained on their own data. It allows businesses and websites to customize their own chatbots for customer support, shopping assistance, and educational purposes. The REST API enables programmatic bot management, response generation, training data management, and conversation retrieval.

## Authentication

Botsonic uses API token-based authentication via HTTP headers. There are two types of tokens:

### 1. Bot-Specific API Token

Each bot has its own API Token, obtained by navigating to the chatbot's Integration Page > REST API and copying the API Token. This token is used for bot-scoped operations such as generating responses. It is passed as a header in API requests (typically as `token` in the request header).

**Base URL:** `https://api.botsonic.ai/v1/botsonic/`

### 2. Account-Level API Secret Key

From the left-hand side menu, click [API], then click [Create new Secret Key]. Access to this feature varies based on the specific plan you have chosen. Enter a name for the secret key, then click [Create Secret Key] to generate a new secret key. This key is used for account-wide business API endpoints (bot management, data management, FAQs, etc.) and is passed as a header in requests.

**Base URL for business endpoints:** `https://api.botsonic.ai/v1/business/`

**Note:** The free and plus plans are unable to access the API. You need to upgrade to the business plan.

## Features

### Response Generation

Send a message to a bot and receive an AI-generated response based on the bot's training data. Supports both synchronous and streaming response modes. The request involves parameters like `chat_id` and `chat_history` in the JSON payload.

### Bot Management

Create new bots, list all bots associated with the account, retrieve detailed information about specific bots, and delete bots. You can also retrieve a bot's API key programmatically.

### Training Data Management

Upload and manage the knowledge base that powers the bot's responses. Supported operations include:

- File upload in PDF, DOC, and DOCX formats, URL links (including YouTube video links), or an entire website sitemap.
- Bulk uploading URLs for training.
- Uploading text content directly.
- Retrieving all training data files and deleting specific data entries.
- Checking the processing status of uploaded data.

### FAQ Management

Manage FAQs (frequently asked questions) associated with the bot, facilitating the creation, update, and deletion of FAQs. FAQs allow the bot to give precise answers to known common questions.

### Starter Questions Management

Manage starter questions — predefined questions to streamline user interactions and enhance the bot's responsiveness. You can create, update, delete, and list starter questions, as well as retrieve starter presets by bot ID.

### Conversation History

Access and manage chat conversations. Retrieve all conversations for a bot, get details of a specific conversation by chat ID, and end active chat sessions. Useful for reviewing interactions, analytics, and quality assurance.

## Events

The provider does not support events. Botsonic does not offer webhooks or event subscription mechanisms through its API.
