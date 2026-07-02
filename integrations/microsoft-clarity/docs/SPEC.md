Note: The search result from `developer.clarityapp.ai` (index 27) is for a different product called "Clarity" (a messaging/CRM app), not Microsoft Clarity. I'll disregard that. Microsoft Clarity does not appear to offer native webhooks.

# Slates Specification for Microsoft Clarity

## Overview

Microsoft Clarity is a free web analytics tool that provides session recordings, heatmaps, and behavioral insights for websites. It captures user interactions like clicks, scrolls, and navigation patterns to help understand how visitors use a website, and surfaces behavioral signals such as rage clicks, dead clicks, and excessive scrolling.

## Authentication

Microsoft Clarity uses **API token (Bearer token)** authentication for its Data Export API.

To obtain a token, go to your Clarity project, select **Settings → Data Export → Generate new API token**, and provide a descriptive name for the token.

Access to the API is secured via JWT tokens. Include the token in the `Authorization` header as a Bearer token:

```
Authorization: Bearer <Your_API_Token>
```

**Important details:**

- Token names must be at least 4 characters long.
- Only project admins can generate and manage access tokens.
- To ensure security, promptly replace API tokens if a user with access is removed from the project.

For the **client-side JavaScript API** (used on webpages for tracking), your Clarity ID serves as your API key. No other client API key is necessary, and there is no cost for using Clarity client APIs.

## Features

### Dashboard Data Export

Fetches dashboard data structured in JSON format over a specified date range and can break down insights by up to three dimensions.

- The `numOfDays` parameter accepts 1, 2, or 3, relating to the last 24, 48, or 72 hours respectively.
- Available dimensions include: Browser, Device, Country/Region, OS, Source, Medium, Campaign, Channel, and URL.
- Available metrics include: Scroll Depth, Engagement Time, Traffic, Popular Pages, Dead Click Count, Rage Click Count, Quickback Click, Excessive Scroll, Script Error Count, and Error Click Count.
- Data retrieval is confined to the previous 1 to 3 days only. Maximum of 10 API requests per project per day. Responses are limited to 1,000 rows.

### User Identification

Custom identifiers are informational data values about site visitors that are sent to Clarity by your client-side code over its Identify API. They include custom-id, custom-session-id, and custom-page-id.

- You can filter dashboard, session recordings, and heatmaps to a specific custom-user-id using the custom filters.
- Clarity securely hashes the custom-id on the client before being sent to Clarity servers.
- A friendly name can optionally be provided for display purposes.

### Custom Tags

Pass the `set` argument along with a key-value pair to define a tag in your JavaScript. When Clarity collects data for that tag, it appears in the Filters options.

- There is no limit to the number of custom tags you can have.
- Tags support both single values and arrays of values.

### Smart Events (Custom Event Tracking)

Call the event API with the action you'd like to track. When Clarity collects data for this event, it appears with your other Smart events in the Filters, Dashboard, Settings, and Recordings vertical.

- Smart Events automatically surface key user actions: purchases, add-to-cart actions, form submissions, logins, contact requests, and more.
- Three types: Auto Events (detected automatically), User-Defined Events (configured no-code), and API Events (instrumented via code).
- The feature allows capturing only the event name without event parameters or properties.
- This feature does not yet support projects for mobile applications.

### Session Recording Prioritization

You can use the upgrade API to prioritize specific types of sessions for recording. This is useful if you have sessions with specific types of events (such as clicks) that you want to look at or interactions with specific parts of your website (such as a shopping cart).

### Content Masking Control

By default, users' sensitive content is masked. Clarity classifies all input box content, numbers, and email addresses as sensitive content. Masked content isn't uploaded to Clarity.

- Content can be selectively masked or unmasked using HTML attributes (`data-clarity-mask`, `data-clarity-unmask`).

### Cookie Consent Management

If your project is configured to require cookie consent, Clarity uses a unique first-party cookie to track each user. If cookie consent is required, you must call the consent API to indicate that you have consent from the user.

- Supports granular consent for ad storage and analytics storage separately via the v2 consent API.

## Events

The provider does not support webhooks or event subscriptions. Microsoft Clarity does not offer a native webhook or push-based notification mechanism for server-side event delivery. The Zapier integration for Clarity uses polling of dashboard metrics rather than a purpose-built event subscription system.
