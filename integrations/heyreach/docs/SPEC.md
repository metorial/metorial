Now let me get the detailed API documentation and webhook details:Now let me get more details on the API endpoints:I now have enough information to compile the specification. Let me put it together.

# Slates Specification for Heyreach

## Overview

HeyReach is a cloud-based LinkedIn outreach automation platform designed for lead generation agencies and sales teams. It allows users to automate and scale LinkedIn outreach campaigns by sending connection requests, personalized messages, and InMails using multiple LinkedIn accounts. The platform centralizes all accounts and outreach efforts into a unified inbox, simplifying the management of multiple accounts and conversations.

## Authentication

HeyReach uses API key authentication. The API key is used to authenticate incoming requests and map them to your organization.

- **Obtaining the API key**: Log in to your HeyReach account, in the left sidebar click Integrations, find the API section, and click to generate a new API key.
- **Using the API key**: Add the `X-API-KEY` request header to every request and set your API key as the value.
- **Base URL**: `https://api.heyreach.io/api/public/`
- **Key validity**: API keys never expire, however they can be deleted/deactivated.
- **Verification endpoint**: You can verify your API key by sending a GET request to `https://api.heyreach.io/api/public/auth/CheckApiKey` with the `X-API-KEY` header. If everything is working properly, you should get a `200` HTTP status code.

## Features

### Campaign Management

Retrieve, monitor, and control LinkedIn outreach campaigns. You can list all campaigns with pagination, get detailed campaign information, and toggle campaign status to pause or resume campaigns. Campaigns cannot be created via the API — they must be created in the HeyReach UI first. You can also get detailed campaign performance metrics including response rates and connection rates.

### Lead Management

Add and manage leads within campaigns and lists. You can get lead details, retrieve all lead lists, and create new empty lead or company lists. Leads can be added to campaigns or lists with personalization data including first name, last name, LinkedIn profile URL, location, company, position, email, and custom fields. You can add up to 100 leads per request. Custom field names must exactly match the variable names defined in HeyReach sequences and can only contain alphanumeric characters and underscores. The campaign should be launched once; only then can you add leads via API.

### List Management

Create and manage lead and company lists. You can create empty lists, retrieve all lists, get leads from a specific list, and delete leads from a list. Lists serve as containers for organizing leads before or during campaign assignment.

### Messaging and Conversations

Get a LinkedIn conversation with its messages by ID. You can also send a direct message to a lead and retrieve conversations with advanced filtering options.

### LinkedIn Sender Accounts

Retrieve information about connected LinkedIn sender accounts. You can get network profiles for specific LinkedIn accounts to understand sender capacity and availability.

### Analytics and Statistics

Get comprehensive analytics and statistics across your campaigns, including overall performance metrics such as total leads, contacted count, replied count, connected count, response rate, and connection rate.

## Events

HeyReach supports webhooks that push data out in real time when specific LinkedIn outreach events occur. HeyReach offers 20+ webhook events. When creating a webhook, you configure the webhook URL, select specific campaigns (or all campaigns), and choose the event type. Webhooks can be scoped to the account level or to specific campaigns.

### Connection Events

- **Connection Request Sent**: Notifies when a connection request has been sent to a LinkedIn account through a HeyReach campaign.
- **Connection Request Accepted**: Triggered when a LinkedIn account accepts your connection request as part of a HeyReach campaign.

### Messaging Events

- **Message Sent**: Occurs when you send a LinkedIn message through a HeyReach campaign (connection request messages are not tracked).
- **Message Reply Received**: Activated when you receive the first reply to a LinkedIn message as part of a HeyReach campaign.
- **InMail Sent**: Fires when an InMail is sent through a campaign.
- **InMail Reply Received**: Triggers when a prospect replies to an InMail message.

### Engagement Events

- **Liked Post**: Triggers when a post is liked through a campaign action.
- **Viewed Profile**: Triggers when a profile is viewed as part of a campaign.
- **Follow Sent**: Fires when a follow action is performed through a campaign.

### Campaign Events

- **Campaign Completed**: Triggers when a campaign finishes.

### Lead Events

- **Lead Tag Updated**: Fires when a lead's tag is updated. The "Every reply received" and "Lead tag updated" events trigger regardless of the campaign, while other events are campaign-scoped.
