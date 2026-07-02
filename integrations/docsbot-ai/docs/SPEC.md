Now let me check if DocsBot has webhook support and look at the sources and bots API in more detail.Now let me check for the question logs/rating API and verify there are no webhooks:I now have sufficient information to write the specification. Based on my research, DocsBot AI does not appear to support webhooks or event subscriptions through its own API (it uses Zapier for third-party integrations but doesn't offer native webhook endpoints).

# Slates Specification for DocsBot AI

## Overview

DocsBot AI is a platform for creating custom AI chatbots trained on your own documentation, websites, and other content sources. It enables the creation of custom chatbots trained on your documentation, facilitating automated customer support and content generation. It supports importing content from 37+ sources including docs, websites, cloud connections, and more.

## Authentication

DocsBot uses the standard `Authorization` header to authenticate requests with a Bearer token for all its REST APIs. You can authenticate requests by including your API key in the `Authorization` header prefixed with the "Bearer" keyword.

**Format:** `Authorization: Bearer YOUR_API_KEY`

API keys are unique to each user account and their permissions mirror that of your user account. For example, if your user account has access to multiple teams, your API key will also have access to all of those teams.

To use the APIs, you need to get an API key from the API Keys section of your DocsBot dashboard. API keys are only shown once as they are stored safely hashed, so make sure to copy it to a safe place. If you lose or forget your key you will have to create a new one.

Most API calls also require a **Team ID** and **Bot ID** as path parameters. You can find your team ID in the dashboard API page.

**Base URLs:**

- Admin API: `https://docsbot.ai/api/`
- Chat API: `https://api.docsbot.ai/`

There are no OAuth flows or scopes. Authentication is solely API key-based.

## Features

### Team Management

The admin API is organized around teams. When you sign up for DocsBot it creates a team, and then you can create bots and sources for that team. A team is the basic root of a DocsBot account. Plans and limits are tied to a team, which has a collection of bots and their sources. Multiple user accounts can be assigned to a team. You can list all teams your API key has access to, retrieve a specific team, and update team settings (e.g., name or OpenAI key).

### Bot Management

You can create bots for your team. Each bot has a name and a description and various settings. You can create as many bots as you want depending on the team plan, and you can also delete bots. Bot settings include privacy level (public/private), language, AI model, custom prompt instructions, allowed domains, branding/color customization, and widget labels.

### Source Management

You can add sources to train your bots. This could be a URL, a document file, a sitemap, etc. The source API allows you to programmatically add new content to your bots. You can upload large files directly to temporary cloud storage via a presigned upload URL, then provide that path to the create source API call. Sources can be listed, retrieved, edited, and deleted.

### Chat & Q/A (AI Agent Interaction)

You can use the chat API endpoints to create your own Q/A and chat interfaces in your product. The recommended Chat Agent API supports:

- Multi-turn conversations with conversation ID tracking
- Streaming responses via SSE, where the answer is sent as a stream of events so you can display progress to the user as it's generated.
- Multimodal inputs — newer AI models support both text and images via the `image_urls` parameter to provide additional context.
- Configurable parameters including `context_items`, `full_source`, `auto_cut`, `reasoning_effort`, and `search_limit`
- Support escalation, triggered when the LLM determines the user requests human support, providing a seamless transition from AI to human support.
- Follow-up rating collection that asks the user if the answer was helpful and provides options for the user to respond.
- User metadata (name, email) can be attached to requests

### Answer Rating & Escalation

Allows users to rate answers from the chat APIs either positive, negative, or neutral (resetting the rating). This is useful for recording statistics on the answers shown in your chat logs. When a user escalates a chat to human support it is best practice to record that using the escalation API call.

### Question & Answer History

Once you've deployed your bot to production, you can view the questions and answers that your users are asking. This is a great way to see how your bot is performing and to see what questions your users are asking. You can also use this data to improve your bot. Questions can be listed and deleted.

### Conversation History

The Conversations API gives programmatic access to complete conversation sessions between users and your AI Agent. Instead of isolated question logs, you can retrieve full conversations with rich context, summaries, metadata, and user feedback. Conversations can be listed, retrieved individually, and deleted.

## Events

The provider does not support events. DocsBot AI does not offer native webhooks or event subscription mechanisms through its API. Third-party automation is possible through Zapier and Make integrations, but these are not purpose-built event systems within the DocsBot API itself.
