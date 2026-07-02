Now let me get more details on the Sync API and the webhook event types for content items:Now I have enough information to compile the specification. Let me put it together.

# Slates Specification for Kontent.ai

## Overview

Kontent.ai is a headless CMS (Content Management System) that provides API-first content management and delivery. It allows teams to create, manage, and deliver structured content to any channel through REST and GraphQL APIs. The platform supports multi-language content, customizable workflows, taxonomy management, and asset management across multiple projects and environments.

## Authentication

Management API uses OAuth 2.0 bearer token (API key) to authorize requests. Requests are sent over HTTPS and authenticated using the Authorization header in the format: `Authorization: Bearer <YOUR_API_KEY>`.

Kontent.ai uses three types of API keys depending on the API being accessed:

### Delivery API Keys

- Used to retrieve content from Delivery REST API and Delivery GraphQL API.
- Delivery API doesn't require authentication by default, meaning assets and published content are publicly available. If you enable secure access or want to preview content using Delivery Preview API, you need to authenticate with a valid Delivery API key.
- Delivery API keys also work for Sync API, which is built on top of Delivery API.
- Found in **Project settings > API keys > Delivery API keys**.

### Management API Keys

- Management API keys are found in Kontent.ai > Project settings > API keys, are limited to project managers, and allow access to specific resources based on the API key permissions, providing access to content in specific environments based on the API key configuration.
- Management API keys have a static set of customizable permissions. Use unique Management API keys when integrating with third-party services or for continuous usage in production.
- Personal API keys have a dynamic set of inherited permissions — the API key has the same permissions as its owner.
- Base URL: `https://manage.kontent.ai/v2`

### Subscription API Keys

- Subscription API keys are found in Kontent.ai > Subscriptions > Your subscription > Subscription API, are limited to subscription admins, and provide complete access to the projects and subscriptions to which the subscription admin has access.
- Requires Enterprise or Flex plan.
- Base URL: `https://manage.kontent.ai/v2/subscriptions`

All API requests require an **Environment ID** (formerly project ID), which identifies the specific environment within a project. This is included as a path parameter in most API calls (e.g., `https://manage.kontent.ai/v2/projects/<ENVIRONMENT_ID>/items`).

The API key expiration length is set to 6 months by default for Management API keys, which is the recommended expiration length.

## Features

### Content Delivery

Delivery REST API can be used to retrieve published content or to preview content. Preview content returns the latest versions of content items (both published and unpublished), while published content returns only published versions. Both use the same endpoints but with different base URLs: `https://deliver.kontent.ai/<ENVIRONMENT_ID>/` for published and `https://preview-deliver.kontent.ai/<ENVIRONMENT_ID>/` for preview. Content can be filtered, sorted, and projected. A GraphQL API is also available as an alternative to the REST API.

### Content Management

Management API allows you to manage your content & assets, content model, environment settings, and users. Content items contain metadata (like name, last modified) but don't contain content directly — they serve as wrappers for language variants, which hold the actual content. You can create, update, upsert, and delete content items and their language variants.

### Content Model Management

Content types serve as templates for content items so that each item has a predefined structure. Through the API, you can manage content types, content type snippets, and their elements. Supported element types include text, rich text, number, date & time, asset, linked items, taxonomy, multiple choice, custom elements, and more.

### Asset Management

Assets in Kontent.ai consist of a reference to a binary file and metadata describing the file. Each binary file can be referenced only by a single asset. You can upload binary files, create assets with metadata, organize assets into folders, and manage asset renditions (cropped/transformed versions of images).

### Taxonomy Management

Taxonomy groups allow you to categorize and classify content using hierarchical term structures. You can create, modify, and delete taxonomy groups and their terms via the API.

### Workflow and Publishing

Workflows define the content lifecycle stages and transitions between them. You can manage workflows, move content items through workflow steps, publish, unpublish, schedule publishing, and create new versions of content items. Management API permissions cover changing workflow of content item variants, creating new versions, deleting items, deleting variants, and publishing/scheduling/unpublishing variants.

### Languages and Localization

Content can be localized into multiple languages. You can manage languages (add, modify, activate, deactivate) and each content item can have separate language variants with localized content.

### Collections and Spaces

Collections set boundaries for your content items, letting you simplify the organization of content according to your business structure. Spaces provide channel-specific context for your content, helping manage multiple websites. Both can be managed via the API.

### User and Role Management

Under a subscription, you can list users in your projects and environments, retrieve user metadata, and manage access by activating or deactivating users. Through Management API, you can invite users and change user roles. Role management is available on Enterprise or Flex plans.

### Content Synchronization (Sync API)

The Sync API offers a queue-based model for consuming content changes on your own schedule, maintaining a queue of changes that you can pull when ready. It uses continuation tokens to track your position and returns deltas of changes since the last sync. It allows tracking changes such as new language versions and content items, content model adjustments, workflow updates, and basic content updates.

### Image Transformation

You can apply image transformations on assets from the APIs. This includes resizing, cropping, and format conversion via URL parameters.

### Environment Management

You can manage environment settings, clone environments, and manage preview URLs through the API. This supports content migrations between environments and projects.

## Events

Webhooks provide an event-based notification mechanism that you can use to observe direct changes in individual objects in your project. You can specify filters to make sure you're notified only about the objects and events you want.

Webhooks can be created via API or UI. In Kontent.ai, go to Environment settings > Webhooks, click Create new webhook, and specify a name and publicly available webhook URL. You select whether the webhook triggers on changes in Published data or Preview data.

Webhook notifications are validated using the `X-Kontent-ai-Signature` header. The signature is a base64-encoded hash generated using HMAC-SHA-256 with the webhook's secret key.

### Content Item Events

Content items might differ between their latest and published versions. Different content item events are available for preview data vs. published data. Events include content item created, changed, deleted, restored, and workflow step changed. For workflow step change events, the payload contains information about the previous workflow and workflow step. You can filter events by specific content types.

### Asset Events

Webhooks are available for assets as well, making it easier to distinguish which entity was the source of a change. Triggers when assets are created, changed, or deleted.

### Content Type Events

Content type events inform you about changes made to your content types. You can filter the content type events to changes made in specific content types.

### Language Events

Language events inform you about changes made in the localization settings. You can filter language events to changes made in specific languages.

### Taxonomy Events

Taxonomy events inform you about changes made to your taxonomy groups and their terms. You can filter the taxonomy events to changes made in specific taxonomy groups.
