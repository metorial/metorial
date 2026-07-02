Now let me look at the actual API docs to understand the full set of features:Now I have enough information to write a comprehensive specification.

# Slates Specification for Mailercloud

## Overview

Mailercloud is a cloud-based email marketing platform that enables businesses to create and send email campaigns, manage contact lists, set up email automations, and track campaign performance. It helps businesses send marketing campaigns and high-deliverability transactional emails. It also offers an Email API to integrate email-sending capabilities into applications, automate transactional emails, and monitor delivery.

## Authentication

Mailercloud uses **API key** authentication. Mailercloud uses API keys for authentication.

To generate an API key:

1. Log in to your Mailercloud account, click on your name in the bottom left corner of the sidebar and select Account. In the Integrations section, find the API Keys tab and click on it. Click on the Create API Key button. Enter an appropriate name for the API key and click the Generate Key button. The newly generated API key will now be displayed in the list of API keys.

The API key is passed as an `Authorization` header in every request to the API base URL `https://cloudapi.mailercloud.com/v1/`. Example:

```
curl --request POST \
  --url https://cloudapi.mailercloud.com/v1/list \
  --header 'Authorization: YOUR_API_KEY_HERE'
```

It is recommended to assign a distinct API key for each integration and label it with the integration's name.

## Features

### Contact Management

Manage contacts (subscribers) in your Mailercloud account. You can add a new contact to a selected list, create new lists, and update existing contacts. Contacts support standard fields such as name, email, city, state, zip, country, phone, industry, department, job title, organization, and lead source. You can also pass custom fields to Mailercloud.

- Contacts are always associated with a list (list ID is required when creating a contact).
- Contacts can have a `contact_type` (e.g., "active").

### Contact Lists

Lists (also known as recipients) are where you store and manage all of your contacts. You can create, retrieve, and manage lists via the API. Actions include adding contacts to a list, removing contacts from a list, finding contacts in a list, and updating contacts.

### Contact Properties

You can list all the properties of your contacts in your Mailercloud account. Custom properties can be created, updated, and deleted. Editing custom property type via the API is not possible; you can only edit the name and description. If a property is used in a webform, you cannot delete it.

### Campaign Management

The API allows creating email campaigns. For creating a campaign, HTML or plain text content and a list ID or segment are mandatory. You can create, send, and track email campaigns programmatically.

### Email Automation

Email automation enables sending targeted emails to individual customers, delivering relevant and personalized emails to each customer. Automations can target contacts from lists, segments, or webforms. The API exposes endpoints for managing automations.

- Lists: You can apply automation to up to 150 lists. Segments: You can apply automation to one segmentation list. Webforms: You can apply automation to up to 150 webforms.

### Segmentation

Contact list segmentation lets you deliver more targeted emails by dividing your list into smaller audiences based on certain rules. You can categorise subscribers based on criteria like subscription status, contact rating, campaign tags, gender, age, nationality, department, etc. Segments can be used as targets for campaigns and automations.

### Transactional Email (Email API)

The Email API allows you to send both transactional emails and marketing campaigns. Whether you need to send transactional notifications, manage email campaigns, organize contacts, or monitor email performance, the Email API provides endpoints that integrate with your existing tech stack. SMTP relay is also available as an alternative sending method.

### Webhooks Management

The API allows programmatic creation and management of webhooks. Mailercloud webhook is a mechanism that allows external systems to receive real-time updates and notifications about events occurring within your account. You can create, list, and manage webhooks via the API.

- In the Free Plan, users can create up to 20 webhooks, while Premium and Enterprise Plans allow up to 50 webhooks. Free Plan users can trigger a maximum of 10,000 events per day, while Premium and Enterprise Plans offer unlimited event triggers per day.

### Account Information

You can retrieve account and plan information via the API (e.g., current subscription plan details).

## Events

Mailercloud supports webhooks that send real-time HTTP POST notifications to a specified URL when specific email events occur.

Webhooks can be triggered by the following triggered events: send, open, click, fail, spam, unsubscribe and bounce.

### Send Event

Triggered when an email campaign is sent to recipients. Includes details about the recipients and campaign. The payload is delivered in batches (e.g., 1000 recipients per trigger).

### Open Event

Triggered when a recipient opens an email. Includes the recipient's information and the timestamp of the open event.

### Click Event

Triggered when a recipient clicks a link in an email. Includes the clicked URL and the timestamp of the click event.

### Fail Event

Triggered when an email fails to deliver to a recipient.

### Spam Event

Triggered when a recipient marks an email as spam.

### Unsubscribe Event

Triggered when a recipient unsubscribes from the mailing list.

### Bounce Event

Triggered when an email bounces (hard or soft bounce), indicating the recipient's mail server rejected the message.

**Configuration:** When creating a webhook, you specify the target URL and which event types to listen for. In the event of a webhook delivery failure, a retry mechanism is activated. The system will automatically attempt to resend the webhook payload up to three times. Retries are triggered when the response is not 200, 201, or 204, or in cases of timeouts. The retry time interval is 10 seconds between each attempt.
