Now let me look at the API reference to understand the full scope of API features:Let me get the full API reference to see all available endpoints:Now I have enough information to write the specification. Let me also check for any additional API features like fields and users management:I now have enough information to write the specification.

# Slates Specification for Bigmailer

## Overview

BigMailer is an email marketing platform designed for agencies, franchises, and multi-brand businesses. It helps businesses manage transactional and promotional emails for different brands. BigMailer's built-in brand and user-access management allows you to easily manage many subaccounts and team members from a single account.

## Authentication

BigMailer uses API key authentication. The HTTP header `X-API-Key` must be specified on all API calls.

- **Base URL:** All API endpoints begin with the prefix `https://api.bigmailer.io/v1`.
- **API Key:** An API key is created using the API key management page in the BigMailer console.
- **Header:** Pass the API key via the `X-API-Key` HTTP header.
- **Permissions:** You will need to create a new API key and select what actions are allowed, such as create/update/upsert Contacts, list/get/create/update Lists, list/get Brands, and list/get/create/update Fields.
- **Verification:** You can check your application is properly configured by making an API call to `https://api.bigmailer.io/v1/me`.

## Features

### Brand Management

Manage multiple brands (subaccounts) from a single account. You can programmatically create a brand and update brand settings. Each brand has its own lists, contacts, campaigns, and senders. You can also create/invite a user to manage brands. It's possible to share a sender domain across brands when using BigMailer sending service; once a domain is verified, an account administrator can expose that domain across brands.

### Contact Management

Create, update, list, and retrieve contacts within a brand. An UPSERT contact endpoint allows updating a contact record if it exists, otherwise creating a new contact. Contacts are associated with one or more lists and can have custom field values (strings, integers, dates). To validate emails added via API, pass a flag `validate=true` to the create contact or upsert contact endpoints. The Get Contact API returns info on soft/hard bounces and complaints.

### List Management

Create, update, list, and retrieve lists within a brand. BigMailer lists behave like tags (virtual groups of emails) and don't allow for storing duplicate email addresses when a contact is part of multiple lists.

### Suppression Lists

Manage suppression lists at the brand level. Suppression lists do not count towards your billing total. Useful for managing opt-out data from partner or affiliate campaigns.

### Custom Fields

Create and manage custom fields for contacts within a brand. Fields can be created automatically during an import or API call, but it is recommended to define fields with proper data types upfront to ensure correct segmentation behavior.

### Transactional Email Sending

Trigger transactional campaign emails from your application. Campaigns must first be configured in the BigMailer console with from address, subject line, and body template. The API call specifies the recipient email, field values (stored on the contact), and variables (used only for merge tag replacement in that send). The transactional API stores the email address and field values of the contact; if the email address does not exist the contact is created, if it exists the contact is updated, and in either case the contact is added to the configured list.

### Bulk Campaign Management

Create and list bulk (marketing) campaigns within a brand. Bulk campaigns can target specific lists or segments and support A/B testing of subject lines.

### Sender Management

Manage senders (from addresses) for a brand, including creating and deleting sender identities.

## Events

BigMailer supports webhooks for receiving event notifications. Webhooks provide a method for your application to be notified when events happen within BigMailer, by making HTTP calls with event data to a URL you provide. Webhooks are configured on the API page in the BigMailer console, where you specify the endpoint URL and select event types. All webhook events are signed with an `X-BigMailer-Signature` header using HMAC SHA256 for verification.

### Bounce Events

A bounce event is sent when an email sent to a contact bounces. Includes bounce type (hard or soft), campaign ID, contact ID, and email address.

### Click Events

A click event is sent when a contact clicks on a link in a campaign. Includes the link URL, campaign ID, and contact ID.

### Open Events

An open event is sent when a contact opens an email sent to them. Includes campaign ID and contact ID.

### Unsubscribe Events

An unsubscribe event is sent when a contact modifies their own subscription status. Includes whether the contact unsubscribed from all future campaigns or specific message types.

### Complaint Events

A complaint event is sent when a contact reports an email as spam. You can specify the event type (unsubscribe, bounce, complaint) for BigMailer to send you when configuring the webhook.
