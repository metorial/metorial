# Slates Specification for ConvertKit

## Overview

ConvertKit is now branded as Kit. It is an email marketing platform for creators, newsletters, courses, memberships, and digital products. This integration exposes the practical high-value Kit API V4 surfaces for subscriber management, tags, forms, sequences, sequence emails, broadcasts, purchases, account insights, posts, snippets, segments, and email templates.

The implementation targets Kit API V4 at `https://api.kit.com/v4`. Legacy API V3 is deprecated and is not used for integration business logic.

## Authentication

Kit API V4 supports two authentication modes.

### OAuth 2.0

OAuth is the supported mode for public applications and is required by selected V4 endpoints, including purchase creation.

- Authorization URL: `https://api.kit.com/v4/oauth/authorize`
- Token URL: `https://api.kit.com/v4/oauth/token`
- Refresh URL: `https://api.kit.com/v4/oauth/token`
- Access tokens are sent as `Authorization: Bearer <token>`.
- Refresh responses can rotate both the access token and refresh token.

### V4 API Key

API key authentication is intended for personal account automation and testing. V4 API keys are sent with `X-Kit-Api-Key: <key>`. API key authentication does not grant access to every V4 endpoint, so tools that call OAuth-only endpoints surface upstream authorization failures as `ServiceError`.

## Tool Coverage

### Account

- `get_account`: retrieve account name, plan, primary email, timezone, and sending addresses.
- `get_account_insights`: retrieve creator profile, email stats, or growth stats.

### Subscribers

- `list_subscribers`: list/search subscribers, including tag, form, or sequence filtered subscriber lists.
- `manage_subscriber`: create, update, get, unsubscribe, list subscriber tags, or fetch subscriber stats.

### Tags

- `manage_tags`: list, create, update, tag subscribers, untag subscribers, or list subscribers for a tag.

### Forms

- `manage_forms`: list forms and landing pages, or add a subscriber to a form.

### Sequences and Sequence Emails

- `manage_sequences`: list, create, get, update, delete, or add a subscriber to a sequence.
- `manage_sequence_emails`: list, create, get, update, or delete sequence emails.

### Broadcasts

- `manage_broadcasts`: list, create, get, update, delete, retrieve stats, or list click analytics for broadcasts.

### Custom Fields

- `manage_custom_fields`: list, create, update, or delete custom fields.

### Purchases

- `create_purchase`: create purchase records. This is OAuth-only in Kit API V4.
- `manage_purchases`: list or retrieve purchase records.

### Segments and Templates

- `list_segments`: list saved subscriber segments.
- `list_email_templates`: list email templates.

### Posts

- `manage_posts`: list or retrieve Kit posts.

### Snippets

- `manage_snippets`: list, create, get, update, archive, or restore reusable snippets. Supports inline content snippets and block snippets with HTML document attributes.

## Events

The integration supports Kit webhook automation events for:

- Subscriber activation
- Subscriber unsubscribe
- Subscriber bounce
- Subscriber complaint
- Form subscription
- Tag added
- Tag removed
- Sequence subscription
- Sequence completion
- Purchase created
- Link click
- Product purchase

## Non-Goals

The integration intentionally does not expose every administrative or dashboard-only detail from Kit. Low-value or highly UI-specific dashboard workflows are left out unless they become necessary for agent-driven automation. File-returning/export workflows are not currently exposed; any future file-producing tool must return content through Slate attachments instead of inline payload fields.

## Validation and Error Handling

Tool inputs use top-level `z.object` schemas for MCP/OpenAI tool bridge compatibility. Branching actions are modeled with an `action` enum plus optional action-specific fields and runtime validation.

User-facing validation failures and upstream Kit API failures are surfaced with `ServiceError` from `@lowerdeck/error`.

## Verification

The package includes a schema regression test that serializes every tool input schema with `z.toJSONSchema` and asserts the top-level schema is an object without top-level `oneOf`, `anyOf`, or `allOf`.

Private live E2E coverage lives at `tests/integrations/convertkit/tools.e2e.ts` and covers each tool with safe setup and cleanup. Live E2E should be run only with an appropriate private profile and was not run as part of this update.
