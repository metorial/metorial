Now let me check the actual Memberspot API Swagger documentation to get more details on the endpoints:Now I have enough information to compile the specification. Let me also check the Make.com integration page for more details on available actions/triggers:

# Slates Specification for Memberspot

## Overview

Memberspot is a German e-learning platform (memberspot.de) for creating, managing, and delivering online courses, membership areas, and training programs. It provides course authoring tools, member management, community features, branding customization, and GDPR-compliant hosting on German servers. The API is available on the Enterprise plan and above, or as a paid add-on.

## Authentication

Memberspot uses API keys for authentication. Authentication is done via an API Key passed in the `X-API-KEY` header, with requests made to the base URL `https://api.memberspot.de/v1`.

To obtain an API key:

1. Navigate to your Memberspot account and sign in. Go to **Settings** > **Integrations** > **API Keys**.
2. Click **Create** and enter a name for the key.
3. Copy the generated secret value and store it securely — it is only shown once.

The API is available to all customers on the Enterprise plan and above, as well as all those who have booked the API add-on.

**Example request header:**

```
X-API-KEY: your-api-key-here
Accept: application/json
```

## Features

### User Management

Manage members on your Memberspot platform. You can list all users, look up a user by email address, delete users, and set custom properties on user profiles. Searching for a user by email is Enterprise-only. Custom properties allow attaching arbitrary metadata to users for personalization or segmentation purposes.

### Access & Enrollment Management

Grant access to a course — when the member does not exist, the member will be created automatically. You can also revoke a member's access to a course (member progress in the courses will not be deleted), or delete the access of a member (member progress in the courses will be deleted). Access can be managed both at the offer level (activate/deactivate) and at the order level (activate/deactivate). You can also delete access for a specific order ID.

- Granting access requires: `firstname`, `lastname`, `email`, `offerId`, and `orderId`.
- Access state can be toggled between active and inactive for both offers and orders.

### Offer (Course) Retrieval

Retrieve a list of all available offers (courses/products) configured in your Memberspot account. This is useful for dynamically populating course selections in integrations and automations.

### Course Progress Tracking

List course progress for users and get course progress for a specific course. This enables monitoring learner advancement and triggering actions based on completion status.

### Chapter Access Management

Enable access to specific chapters within a course, allowing fine-grained control over what content a user can access beyond full course-level grants.

### Exam Results

Retrieve exam results for users, enabling tracking of assessment outcomes and automating follow-up actions based on exam performance.

### Login Token Generation

Generate single sign-on login tokens for users, allowing you to create direct login links that can be delivered via email or other channels without requiring users to enter credentials manually.

### Custom Properties Management

List and set custom user properties. These are user-defined fields that can store additional information about members for personalization, reporting, or integration purposes.

## Events

The provider does not support events. Memberspot's API is a REST-only API with no native webhook or event subscription mechanism. To react to changes, external tools (such as Zapier, Make, or Pipedream) can be used to trigger workflows based on events from other connected systems (e.g., payment providers), which then call the Memberspot API.
