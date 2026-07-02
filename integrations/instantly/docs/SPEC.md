Now let me get more details on the API scopes and the full list of API resources.I now have comprehensive information to write the specification. Let me compile it.

# Slates Specification for Instantly

## Overview

Instantly is a cold email outreach and sales engagement platform. It provides tools for managing email campaigns at scale, including unlimited inbox rotation, automated email warmup, a B2B lead database (SuperSearch), email deliverability optimization, and a unified inbox for managing replies across accounts. The API (V2) allows programmatic control over campaigns, leads, email accounts, analytics, and webhooks.

## Authentication

Instantly supports two authentication methods:

### API Key (Bearer Token)

Instantly uses Bearer token authentication. To authenticate, include an `Authorization` header with the value `Bearer <your-api-key>`.

**Generating an API Key:**

1. Navigate to **Settings → Integrations** in the Instantly dashboard (`https://app.instantly.ai/app/settings/integrations`).
2. Click **API Keys** in the left sidebar, then **Create API Key**.
3. Name the key, select the desired scopes, and click **Create**.
4. Copy and securely store the key — it is displayed only once.

It is possible to create multiple API keys (which can be individually revoked), and API scopes provide granular control for each key.

**Available Scope Categories:**
Scopes follow the pattern `resource:action` (e.g., `accounts:read`, `accounts:create`, `leads:all`, `all:all`). Resources include: `analytics`, `accounts`, `campaigns`, `emails`, `email_verification`, `leads`, `lead_lists`, `lead_labels`, `custom_tags`, `custom_tag_mappings`, `block_list_entries`, `inbox_placement_tests`, `api_keys`, `account_campaign_mappings`, `webhooks`, `webhook_events`, `campaign_subsequences`, `workspaces`, `workspace_members`, `workspace_group_members`, `supersearch_enrichment`, `dfy_email_account_orders`, `background_jobs`, `audit_logs`, `crm_actions`. Actions are typically `read`, `create`, `update`, `delete`, and `all`.

API V2 access is available on the Growth plan and above. Webhooks are available on the Hypergrowth plan and above; the Growth plan provides API access but not webhooks.

### OAuth (for connecting email accounts)

Instantly also provides an OAuth flow specifically for programmatically connecting Google Workspace and Microsoft email accounts to a workspace. This is not used for authenticating API calls but for onboarding sending accounts.

- **Google:** `POST /api/v2/oauth/google/init` — returns an `auth_url` for the user to authorize. Only Google Workspace (GSuite) accounts are supported; personal Gmail accounts are rejected.
- **Microsoft:** `POST /api/v2/oauth/microsoft/init` — supports both Microsoft 365 (business) and personal Microsoft accounts.
- **Status polling:** `GET /api/v2/oauth/session/status/:sessionId` — poll to check whether the OAuth flow completed. Sessions expire after 10 minutes.

The OAuth init and status endpoints are authenticated with the same Bearer API key (requires `accounts:create` and `accounts:read` scopes).

## Features

### Campaign Management

Create, configure, launch, pause, and monitor cold email campaigns. Campaigns support A/Z testing of email variations, sending schedules, subsequences (follow-up sequences), and account-to-campaign mappings that control which sending accounts are used.

### Lead Management

Add, update, delete, and query leads. Leads can be organized into lead lists, tagged with custom labels (e.g., Interested, Not Interested, Meeting Booked), and assigned custom variables for personalization. Leads can be added to or removed from campaigns. Interest status can be updated per lead per campaign.

### Email Account Management

Manage connected sending accounts (Google Workspace, Microsoft, or IMAP/SMTP). Accounts can be linked to campaigns via account-campaign mappings. The OAuth flow allows programmatic connection of Google and Microsoft accounts.

### Email Sending & Tracking

Access sent emails and replies. View email threads and individual messages associated with campaigns and leads.

### Email Verification

Verify email addresses to reduce bounces before adding them to campaigns.

### Inbox Placement Testing

Run inbox placement tests to check whether emails land in primary inbox, spam, or promotions. Retrieve analytics, blacklist reports, and SpamAssassin scores for placement tests.

### SuperSearch Enrichment

Enrich leads using Instantly's B2B contact database (SuperSearch). Supports email enrichment and LinkedIn enrichment to find and verify prospect contact information.

### Block List Management

Manage block lists to prevent emails from being sent to specific addresses or domains.

### Custom Tags

Create and assign custom tags to organize accounts and campaigns. Tags can be used as filters when listing accounts and campaigns.

### Lead Labels

Manage lead labels used to categorize lead responses and statuses within campaigns.

### Analytics

Retrieve campaign analytics including sends, opens, clicks, replies, bounces, and other engagement metrics.

### Workspace & Team Management

Manage workspace settings, workspace members, and workspace group members. Workspace groups allow organizing multiple workspaces under a shared structure.

### DFY (Done-For-You) Email Account Orders

Manage done-for-you email account setup orders, including domain checks, similar domain suggestions, and pre-warmed-up domain lists.

### Background Jobs

Track the status of long-running asynchronous operations (e.g., bulk lead imports).

### Audit Logs

Access audit logs to review actions performed within the workspace.

### CRM Actions

Perform CRM-related actions to support integration with external CRM systems.

### Email Templates & Custom Prompt Templates

Manage email templates for campaigns and custom AI prompt templates for content generation.

## Events

Instantly supports webhooks that push real-time event notifications to an HTTPS endpoint via POST requests with JSON payloads. Webhooks can be scoped to a specific event type and a specific campaign. Custom HTTP headers can be attached for authentication. You can subscribe to `all_events` to receive every event type including custom labels.

### Email Events

- **email_sent** — An email was sent from a campaign.
- **email_opened** — A recipient opened an email.
- **email_link_clicked** — A recipient clicked a link in an email.
- **reply_received** — A recipient replied to an email.
- **auto_reply_received** — An automatic reply (e.g., out-of-office) was received.
- **email_bounced** — An email bounced.

### Lead Status Events

- **lead_unsubscribed** — A lead unsubscribed from emails.
- **lead_neutral** — A lead's status was set to neutral.
- **lead_interested** — A lead was marked as interested.
- **lead_not_interested** — A lead was marked as not interested.
- **lead_out_of_office** — A lead was marked as out of office.
- **lead_wrong_person** — A lead was flagged as the wrong person.
- **lead_closed** — A lead was marked as closed.

### Meeting Events

- **lead_meeting_booked** — A meeting was booked with a lead.
- **lead_meeting_completed** — A meeting with a lead was completed.

### Campaign Events

- **campaign_completed** — A campaign finished sending all scheduled emails.

### Account Events

- **account_error** — An error occurred with a sending account.

### Custom Label Events

Any custom label configured in the workspace fires as its own event type, sent as-is. Subscribe to `all_events` to capture these.
