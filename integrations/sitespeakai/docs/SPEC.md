Now let me check the Pipedream page more closely for webhook/event info, and also check the remaining API endpoints.Now let me check if there's webhook support by looking at Pipedream's lead event trigger:The search didn't return any SiteSpeakAI-specific webhook results. Based on the Pipedream reference mentioning "Emit new event when a new lead is created," that appears to be a polling-based trigger rather than a native webhook. The SiteSpeakAI API documentation doesn't show any webhook endpoints. Let me check one more thing:I now have enough information to write the specification.

# Slates Specification for Sitespeakai

## Overview

SiteSpeakAI is a no-code AI chatbot platform that lets businesses create custom-trained GPT chatbots using their own content (websites, PDFs, help docs, APIs, databases). The chatbots can be deployed on websites and messaging platforms like Slack, Telegram, and Discord to automate customer support, capture leads, and provide real-time answers.

## Authentication

SiteSpeakAI uses **API key (Bearer token)** authentication.

- **API Token**: Generate an API key from the [Account page](https://sitespeak.ai/user/api-tokens) in the SiteSpeakAI dashboard.
- **Base URL**: `https://api.sitespeak.ai/v1`
- **Header**: Include the token in the `Authorization` header as `Bearer YOUR_API_TOKEN`.

Example:

```
Authorization: Bearer YOUR_API_TOKEN
```

Most endpoints also require a **Chatbot ID** as a path parameter, which can be found on the settings page for each chatbot in the dashboard.

## Features

### Chatbot Querying

Send questions to a trained chatbot and receive AI-generated answers along with source URLs used to formulate the response. Supports grouping messages into conversations via a conversation ID, and responses can be returned in either HTML or markdown format.

### Chatbot Configuration Retrieval

Retrieve the full settings of a chatbot, including appearance (colors, icons, fonts, dimensions, position), behavior (welcome message, placeholder text, system prompt, goals prompt, default answer), AI model settings (model, temperature, topK), escalation configuration, and language settings.

### Conversation History

Access the full history of visitor conversations with a chatbot. Can be filtered by a specific visitor's conversation ID, sorted in ascending or descending order, and optionally include the sources the bot used for each response. Deleted conversations can optionally be included.

### Updated Answers (Fine-tuning)

Manage custom question-and-answer pairs that override or supplement the chatbot's trained knowledge. You can retrieve all existing updated answers, create new question-answer pairs, and delete existing ones. This is useful for correcting or improving specific chatbot responses.

### Lead Management

Retrieve leads captured by a chatbot during conversations. Lead records include visitor information such as name, email, phone, and status.

### Suggested Messages

Retrieve the suggested messages (prompts) configured for a chatbot. These are pre-defined questions shown to visitors to guide them toward relevant content.

### Training Sources

Retrieve the list of content sources used to train a chatbot, including their type (e.g., website), URL, training status, and sync frequency.

### User & Chatbot Management

Retrieve account details for the authenticated user and list all chatbots associated with the account.

## Events

The provider does not support events. SiteSpeakAI's API does not offer webhooks or native event subscription mechanisms.
