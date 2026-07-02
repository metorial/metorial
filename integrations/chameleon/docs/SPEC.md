Now I have enough information to write the specification. Let me compile everything.

# Slates Specification for Chameleon

## Overview

Chameleon is a product adoption platform that enables SaaS companies to create in-app experiences such as product tours, microsurveys, tooltips, launchers (checklists), embeddables, and a HelpBar. With Chameleon, you can create customizable, native-feeling experiences like onboarding checklists, embedded banners, product tours, microsurveys, and launch announcements. It provides a REST API, JavaScript API, and webhooks for programmatic management and data exchange.

## Authentication

Chameleon uses API Key authentication. To get started, you'll need to have a Chameleon account, and then generate a secret API key to use from within your Chameleon Dashboard. API keys can be generated and managed at `https://app.chameleon.io/settings/tokens`.

For REST API requests, authenticate by including the API key in the `X-Account-Secret` header. Click Add Header and enter `X-Account-Secret` for the name and enter your Chameleon API token for the value.

The base URL for the REST API is `https://api.chameleon.io/v3/`.

**Identity Verification (optional but recommended):** Once you encode your User IDs, all REST API requests must use your Secret API key found on the installation page and not your account token. It works by providing a way for Chameleon to verify the authenticity of requests made to their APIs via a digital signature. They provide a secret key with which you generate a verification hash, which they check.

## Features

### User Profile Management

Send data to Chameleon including letting Chameleon know when a user completes an action, or when their profile changes. You can remove/delete user data, opt a user out of Chameleon Experiences, and send variables for users to use within the copy of any Experience (e.g. user first names). You can also search and count user profiles matching specific conditions, and manage user tags.

### Company Management

Manage company (group-level) data that can be associated with user profiles. Company properties can be created, updated, and used for targeting experiences.

### Experience Management (Tours, Microsurveys, Tooltips, Embeddables, Launchers)

You can use the Chameleon API to show a Tour or Launcher, or approve many domains within your product to show Chameleon Experiences. API endpoints allow detailed management of Tours, including listing all created tours, updating segments, and publishing tours. You can also manage Microsurveys, Tooltips, Embeddables, and their individual Steps and Elements.

### Microsurvey Response Data

You can download data from Chameleon (e.g. responses to Microsurveys) periodically or forward Chameleon-tracked events. Responses include details like button text, input text, and page URL.

### Segments

Retrieve and manage audience segments used to target experiences. You can list segments, view which experiences are connected to a segment, and update segment filter expressions.

### Tour Interactions & Deliveries

Access detailed data on how users interact with tours, including started, completed, and exited states. Delivery data tracks when and how experiences are scheduled and delivered to users.

### HelpBar & Product Demos

Manage HelpBar search content and configuration, as well as Product Demos. The HelpBar allows users to search documentation and get AI-powered answers within the product.

### Domains and Environments

Approve and manage domains and environments where Chameleon experiences can be displayed.

### Data Imports

Import user data in bulk via the API, allowing you to sync data from external sources into Chameleon.

### Webhooks Configuration

Chameleon offers support for webhooks in two ways: Update user data within Chameleon using Incoming Webhooks, and send Chameleon data to other services using Outgoing Webhooks. You can manage webhook subscriptions programmatically via the REST API.

- There is a limit of 5 webhook subscriptions per account.
- The Microsurvey submitted Webhook is available for all plans. The other Webhook topics are only available on Chameleon's Growth Plan.

## Events

Chameleon supports both incoming and outgoing webhooks for real-time data exchange.

### Outgoing Webhooks (Chameleon → External Service)

Outgoing Webhooks can be used to send data from Chameleon to other services, and are available for the following "topics" (fired whenever the associated event occurs):

**Tour Events:**

- Tour started – Fired when a user begins a tour.
- Tour completed – Fired when a user finishes all steps of a tour.
- Tour exited – Fired when a user dismisses/closes a tour before completing it.
- Tour snoozed – Fired when a user snoozes a tour.
- Tour Button clicked – Fired when a user clicks a button within a tour step.

**Microsurvey Events:**

- Microsurvey submitted – Fired when a user submits a microsurvey response. Available on all plans.
- Microsurvey started – Fired when a user begins a microsurvey.
- Microsurvey completed – Fired when a user finishes a microsurvey.
- Microsurvey exited – Fired when a user dismisses a microsurvey.
- Microsurvey snoozed – Fired when a user snoozes a microsurvey.
- Microsurvey Button clicked – Fired when a user clicks a button in a microsurvey.

**HelpBar Events:**

- HelpBar search – Fired when a user performs a search query in the HelpBar.
- HelpBar answer – Fired when the AI provides an answer in the HelpBar.
- HelpBar item action – Fired when a user accesses a resource in the HelpBar.
- HelpBar item error – Fired when a HelpBar resource throws an error.

Each outgoing webhook can subscribe to one or more topics. You can select the topic/s, provide a webhook name, set the endpoint URL, and get the Account Secret. The Account Secret can be used to verify the identity of webhook payloads.

### Incoming Webhooks (External Service → Chameleon)

Webhooks provide a simple way to send data to Chameleon from any external tool or system that supports outgoing webhooks. This integration method directly updates user properties, company properties, or user events. Three incoming webhook endpoints are available (unique per account) for user profiles, company data, and events respectively.
