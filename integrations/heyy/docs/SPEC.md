Now let me get the full Heyy API documentation:Let me check the Postman API documentation referenced in the search results:Now let me try to access the Heyy API reference documentation directly:Now I have enough information to compile the specification. Let me synthesize what I've found.

# Slates Specification for Heyy

## Overview

Heyy (heyy.io) is a customer messaging and communication platform that unifies interactions across WhatsApp, Instagram, Facebook Messenger, and website live chat into a single inbox. It connects with WhatsApp, Instagram, Messenger, and your website chat widget, and can be plugged into CRMs, e-commerce systems, ticketing tools, and more using integrations or APIs. It also offers AI Employees — customizable AI entities that handle tasks like customer support, sales, onboarding, or internal operations.

## Authentication

Heyy uses API keys for authentication.

To obtain an API key:

1. Log in to the Heyy Hub (https://hub.heyy.io/).
2. Navigate to **Settings**, then under the **Developers** section, click on **API Keys**, and click **Create API Key**.

The API key is passed as a Bearer token in the `Authorization` header of each request:

```
Authorization: Bearer <your_api_token>
```

The base URL for the API is `https://api.hey-y.io/api/v2.0/`.

## Features

### Business Information

- Retrieve details about your business account on Heyy.
- Used to verify API connectivity and access business-level configuration.

### Contact Management

- Create new contacts for the business.
- Update the details of existing contacts.
- Contacts represent customers or leads that your business communicates with across channels.

### Messaging

- Send WhatsApp messages to contacts.
- Messages are sent to contacts already registered in your business account.
- Heyy supports communication across WhatsApp, Instagram, Messenger, and website chat.

### File Uploads

- Upload files to be used within conversations or associated with contacts.
- Supported formats and file path configuration may be required.

### Campaigns

- Run campaigns for lead nurturing and client communication.
- The platform supports marketing outreach and re-engagement campaigns across connected channels.

### AI Employees

- AI Employees are digital, customizable AI entities that handle tasks like customer support, sales, onboarding, or internal operations — virtual team members that can chat with customers, answer FAQs, qualify leads, or integrate with tools.
- Automatically route complex queries to humans with full conversation context and sentiment awareness.

### Automations & Workflows

- Connect Heyy to CRM, ticketing, e-commerce, and internal tools — or build custom actions via API/webhooks.
- Build automated response flows, escalation paths, and backend workflows.

## Events

Heyy supports webhooks for real-time event notifications.

### Incoming Messages

- Emit new event when a business gets a new incoming message.
- Can be scoped to a specific channel ID.
- Useful for triggering external workflows whenever a customer sends a message through any connected channel (WhatsApp, Instagram, Messenger, web chat).
