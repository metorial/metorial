Now let me check the chatbot/webhook configuration details more closely.Now I have enough information to write the specification.

# Slates Specification for Loomio

## Overview

Loomio is a collaborative decision-making platform that enables groups to hold discussions, create proposals, and run polls with various voting methods (proposals, score voting, ranked choice, dot voting, etc.). It is open-source software developed by Loomio Cooperative Limited.

## Authentication

As of October 2023, Loomio uses a per-user API key system. Each user of Loomio has an API key, and the API uses normal user accounts rather than per-group API keys.

The API key is available on the Loomio API documentation page at `https://www.loomio.com/help/api2` when logged in. The key is passed as a parameter (`api_key`) in requests, either as a query string parameter for GET requests or within the JSON body for POST requests.

It is recommended to create a dedicated user account for API access. The API uses normal user accounts, and you can mark a user as a bot account via the profile page to prevent it from being invited to polls and discussions.

**Base URL:** `https://www.loomio.com/api/b2/`

For self-hosted Loomio instances, replace `www.loomio.com` with your instance domain.

**Note:** OAuth support was previously available but has been removed because it was not being used and considered a security risk.

## Features

### Discussion Management

Create and retrieve discussion threads within groups. Threads can include a title, description (in Markdown or HTML), and can notify specific users, email addresses, or an entire group upon creation.

- Supports specifying a group for the thread or creating standalone threads.
- Recipients can be specified by user IDs, email addresses, or by targeting the whole group.

### Polls and Proposals

Create and retrieve polls and proposals with various voting methods. Supported poll types include: proposals (show of thumbs), multiple choice, score voting, ranked choice, dot voting, and meeting polls (time polls).

- **Poll types:** `proposal`, `poll`, `count`, `score`, `ranked_choice`, `meeting`, `dot_vote`.
- Options can be configured per poll type (e.g., `agree`/`disagree`/`abstain`/`block` for proposals, ISO 8601 datetimes for meeting polls, arbitrary strings for other types).
- Configurable closing time, anonymous voting, result visibility (`off`, `until_vote`, `until_closed`), option shuffling, and closing-soon reminders.
- Voters can be restricted to specified people only (`specified_voters_only`).
- Polls can be associated with an existing discussion thread or a group.

### Membership Management

List and manage group memberships. You can send a list of emails to invite all new email addresses to the group.

- Supports syncing membership with an external list: passing `remove_absent=1` will remove any existing group members whose emails are not in the provided list. Use with caution as this can remove all members.
- Returns a summary of added and removed email addresses.

### Data Retrieval

Fetch details of individual discussions and polls by their ID (integer) or key (string).

- The API is still evolving and described as "development is request driven." Not all internal platform features are exposed through the public integration API.

## Events

Loomio supports **outgoing webhooks** (called "Chatbots") that send notifications to external services when events occur within a group. The webhook-based system can be used to support any system that accepts incoming webhooks with HTML or Markdown formatting.

Chatbots are configured per group and can be set to automatically fire on specific events. They can also be triggered manually (e.g., inviting a chatbot to notify about a specific poll).

### Discussion Events

Notifications when new discussion threads are started within a group.

### Proposal and Poll Events

Notifications when new proposals are created, comments are posted, votes are cast, and outcomes are published.

### Configurable Event Types

Automatic notifications can be enabled per event type in the chatbot settings. Events include new threads, new polls/proposals, new comments, new votes, and outcomes. Each event type can be individually toggled on or off per chatbot.

- **Limitation:** These are outgoing webhooks only (Loomio pushes to an external URL). Loomio does not support inbound webhooks or event subscription callbacks to arbitrary endpoints via its API. The chatbot/webhook configuration is done through the Loomio UI, not programmatically via the API.
