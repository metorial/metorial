Let me get the Stoplight API docs to understand the full set of endpoints.Now I have enough information to compile the specification. Let me synthesize what I've found.

# Slates Specification for Sendlane

## Overview

Sendlane is an email and SMS marketing automation platform focused on eCommerce. It allows users to manage contacts, lists, campaigns, and more programmatically through its API. It enables creating automated email and SMS marketing funnels to welcome new contacts, nurture leads, and update contact profiles.

## Authentication

Sendlane supports two API versions with different authentication methods:

### API v2 (Current) — Bearer Token

Sendlane uses API keys for authentication. For API v2, authentication is done via a Bearer token passed in the `Authorization` header.

- **Base URL:** `https://api.sendlane.com/v2/`
- **Header:** `Authorization: Bearer <API_TOKEN>`
- To obtain credentials, go to Account → API within the Sendlane dashboard. Under Sendlane API V2, click on the API Token button to create a new token.

### API v1 (Legacy) — API Key + Hash Key

API v1 requires an API Key, Hash Key, and Subdomain, found under Account → API. Each call requires the API Key and Hash Key to be passed along with other parameters.

Sendlane has indicated it will be sunsetting API v1, so API v2 with Bearer token authentication should be preferred.

### Custom Integration Token

To implement event tracking calls (eCommerce tracking via JavaScript or Server-Side API), you'll need both API v2 and custom integration tokens. The custom integration token is a separate credential generated in the Sendlane dashboard used to authenticate the JavaScript tracking snippet and server-side event calls.

## Features

### Contact Management

The API allows managing contacts, lists, campaigns, and more programmatically. You can create, retrieve, and update contacts, subscribe/unsubscribe contacts to lists, and manage contact properties. Using Custom Fields, you can collect and record information about contacts that can be used to segment your audience, run automations, and personalize content.

- Contacts can be associated with lists and tags.
- Custom fields can store arbitrary contact attributes.
- Custom Fields cannot be deleted once created.

### Lists and Tags

Tags are labels assigned to contacts based on their unique interests, activity, and behavior, helping create granular collections of contacts for targeted content. Lists serve as the primary groupings for contacts.

- Tags can be added/removed from contacts via the API.
- Lists can be created and contacts can be added/removed.
- Tags cannot be applied to Segments directly. Since Segments are dynamic, contacts move in and out of them.

### Segments

Segments slice your audience into targeted collections of contacts based on dozens of attributes and can be used to send campaigns or start automations.

- Segments are dynamic and update automatically based on defined criteria.
- Can segment by custom fields, tags, eCommerce behavior, and more.

### Campaigns

The API allows you to retrieve details on campaigns. Campaigns are used to send information about a sale or special offer, date, or event-specific content to contacts.

### Automations

An automation is a series of scheduled actions and communications triggered by a contact's behavior and preferences, allowing creation of email and SMS marketing funnels.

- Automation actions include: sending marketing email, SMS, or email notifications; adding or removing lists and tags from contacts; and ending the current automation or starting a new one.
- Automations have a limit of 50 nodes.

### eCommerce Event Tracking

Using a combination of JavaScript and Server-Side APIs, you can bring your eCommerce store's key metrics, like customer behavior and transaction history, into Sendlane for segmentation and targeting.

**JavaScript Tracking API** (client-side):

- Active on Site (contact visits website after clicking a Sendlane email link), Identify (contact visits in identifiable state), Product Viewed, Added to Cart, and Checkout Started.

**Server-Side API** (transactional data):

- Placed Order, Ordered Product, and Fulfilled Order events.
- From the order_placed event, ordered product events execute based on line_items. When an order's status changes to fulfilled, refunded, or canceled, other product events are triggered.
- If the same combination of event and ID are sent more than once, Sendlane will record the first and skip subsequent duplicates.
- Custom events can also be sent as part of the custom integration.

### Sender Profiles

The API allows managing sender profiles (the "from" identities used when sending emails).

## Events

Sendlane supports outbound webhooks via its automation system rather than through a dedicated webhook subscription API.

### Automation-Based Webhooks

A webhook broadcasts information about an action that has taken place — notifications that a specified event has happened. In Sendlane, webhooks are configured as action nodes within automations.

- You set an automation trigger (the action you want to monitor, such as "Subscribes to a List"), and add a webhook action node that sends contact data to your specified URL.
- Every contact that fits the automation trigger's parameters will have its information sent to your webhook endpoint.
- Automation triggers that can fire webhooks include: subscribes to a list, submits a form, SMS consent received, custom field added, order placed, product viewed, added to cart, checkout started, and other eCommerce or behavioral triggers.
- The webhook URL is configured directly within the automation builder. There is no standalone webhook management API for registering endpoints outside of automations.
