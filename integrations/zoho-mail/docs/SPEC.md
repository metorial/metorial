Now let me get the full list of API scopes and more details on features:Now I have comprehensive information. Let me also check the webhook details more closely for Zoho Mail specifically:

# Slates Specification for Zoho Mail

## Overview

Zoho Mail is a business email hosting service that provides email, calendar, tasks, notes, and bookmarks for organizations. It offers REST APIs for managing organizations, domains, users, groups, email messages, folders, labels, tasks, notes, bookmarks, mail policies, and anti-spam settings. It is part of the broader Zoho ecosystem and supports multi-domain, multi-user email management.

## Authentication

Zoho Mail REST API uses OAuth 2.0 for secure authentication and authorization. This is the only supported authentication method (legacy Authtoken was deprecated in December 2020).

**OAuth 2.0 Flow:**

1. **Register your application** at the [Zoho API Console](https://api-console.zoho.com/). You need to register your client application in the Zoho Developer Console, providing a unique client name, a homepage URL, and a redirect URI. Once registration is complete, a unique client ID and client secret will be generated.

2. **Application types supported:** Client-based Applications (browser-only), Server-Based Applications (dedicated HTTP server), Mobile-based Applications, and Non-browser Mobile Applications (smart TVs, printers, etc.).

3. **Authorization endpoint:** `https://accounts.zoho.com/oauth/v2/auth`
4. **Token endpoint:** `https://accounts.zoho.com/oauth/v2/token`

5. **Authorization request parameters:**
   - `client_id` — Your application's client ID
   - `response_type` — `code`
   - `redirect_uri` — Your registered redirect URI
   - `scope` — Comma-separated list of scopes
   - `access_type` — `offline` (to receive a refresh token) or `online`

6. Zoho's OAuth implementation uses Bearer authentication scheme; the access token must be passed in the Authorization header with the prefix `Zoho-oauthtoken`. Access tokens have a lifetime of 1 hour. A refresh token can be retrieved and stored to generate new access tokens as needed.

**Data Center Domains:**
APIs are available across multiple domains based on data center location. Ensure API requests are sent to the appropriate domain. Examples: `mail.zoho.com` (US), `mail.zoho.eu` (EU), `mail.zoho.in` (India), `mail.zoho.com.au` (Australia), `mail.zoho.jp` (Japan). The corresponding accounts domain also varies (e.g., `accounts.zoho.com`, `accounts.zoho.eu`).

**Scopes:**
Scopes follow the format `ZohoMail.<scope_name>.<operation>`, where operation is `READ`, `CREATE`, `UPDATE`, `DELETE`, or `ALL`. Key scopes include:

| Scope                                 | Description                                 |
| ------------------------------------- | ------------------------------------------- |
| `ZohoMail.messages`                   | Email messages (send, read, update, delete) |
| `ZohoMail.accounts`                   | User account settings                       |
| `ZohoMail.folders`                    | Folder management                           |
| `ZohoMail.tags`                       | Label management                            |
| `ZohoMail.tasks`                      | Task management                             |
| `ZohoMail.notes`                      | Notes management                            |
| `ZohoMail.links`                      | Bookmarks management                        |
| `ZohoMail.partner.organization`       | Organization management (partner)           |
| `ZohoMail.organization.accounts`      | Organization user management (admin)        |
| `ZohoMail.organization.domains`       | Domain management (admin)                   |
| `ZohoMail.organization.groups`        | Group management (admin)                    |
| `ZohoMail.organization.policy`        | Mail policy management (admin)              |
| `ZohoMail.organization.spam`          | Anti-spam management (admin)                |
| `ZohoMail.organization.subscriptions` | Storage/subscription management (admin)     |
| `ZohoMail.organization.audit`         | Audit log access (admin)                    |

Some APIs require Admin authentication, while others can be executed with user authentication. Certain APIs support both.

## Features

### Email Management

Send, receive, retrieve, and manage emails including attachments. Supports searching and filtering emails, and saving emails as drafts or templates. Emails can be replied to, marked as read/unread, flagged, archived, moved between folders, marked as spam, and deleted. Labels can be applied to or removed from emails. Emails can also be scheduled for future sending with configurable timezone and date/time.

### Thread Management

Manage email conversation threads as a unit. Threads can be flagged, moved, labeled, marked as read/unread, or marked as spam. Operations apply to all messages within the thread.

### Folder Management

Programmatically create, rename, delete, and manage email folders, supporting organized storage and retrieval. Also enables retrieval and listing of email folders. Folders can be moved, marked as read, emptied, and have IMAP visibility toggled.

### Label Management

Create, update, delete, and assign labels to categorize and filter emails, as well as retrieve existing labels and their associated emails.

### Signature Management

Create, retrieve, update, and delete email signatures at the user level. Admins can also manage signatures on behalf of users across the organization, enabling enforcement of standardized signatures.

### Account Settings

Manage individual email account settings including vacation/auto-reply messages, email forwarding configuration (add, verify, enable, disable, remove), reply-to addresses, display names, and mail account sequences. Users may have multiple accounts including external POP accounts.

### Organization Management (Admin)

Manage organization-level settings including subscription and storage details, allowed IP addresses, and spam processing configuration. Supports creating child organizations for partner/reseller scenarios.

### Domain Management (Admin)

Manage email domain settings, including configuring MX, SPF, and DKIM records to enhance security and improve email deliverability. Also allows retrieving domain details, including verification status and configurations. Additional capabilities include domain alias management, catch-all address configuration, notification address management, subdomain stripping, and setting primary domains.

### User Management (Admin)

Add, retrieve, enable, disable, and delete user accounts within an organization. Manage user roles, reset passwords, add/remove email aliases, and control protocol access (IMAP, POP, ActiveSync) and incoming/outgoing email status per user.

### Group Management (Admin)

Create and manage email distribution groups. Add/remove members, update member roles and settings, manage group email aliases, enable Streams for groups, configure moderation settings, and moderate held emails.

### Mail Policy Management (Admin)

Create and manage organization-wide mail policies including email restrictions, account restrictions, access restrictions, and forwarding restrictions. Policies can be applied to specific users or groups.

### Anti-Spam Configuration (Admin)

Manage organization-level anti-spam settings including SPF fail/soft-fail handling, DKIM fail handling, and DMARC fail handling. Manage spam allow/block lists.

### Task Management

Create and manage personal tasks and group tasks. Tasks support title, description, priority, status, due dates, reminders, recurring schedules, assignees, and subtasks. Tasks can be organized into projects within groups.

### Notes Management

Create and manage personal and group notes. Notes can be organized into books, support file attachments, and can be marked as favorites. Shared notes can also be accessed.

### Bookmarks Management

Create and manage personal and group bookmarks (saved web links). Bookmarks can be organized into collections, marked as favorites, trashed, and restored. Shared bookmarks can also be accessed.

### Logs and Audit (Admin)

Retrieve login history, audit records, and SMTP logs for organizational oversight and compliance.

## Events

Zoho Mail supports outgoing webhooks that can be configured through the Zoho Mail settings interface (Settings > Integrations > Developer Space > Webhooks).

### Incoming Email

With outgoing webhooks, incoming emails can be configured to trigger actions in external applications. Conditions and filter options allow you to select which emails act as triggers. When a new email arrives matching the configured filters, a POST request with email details is sent to the specified webhook URL.

### Task Creation

New tasks created can be configured to trigger actions in external applications. The webhook posts task details to the configured URL when a new task is created.

### Streams Post

New messages posted on Streams can be configured to trigger actions in external applications. The webhook posts message details to the configured URL when a new Streams post is made.

**Note:** Outgoing webhooks are configured through the Zoho Mail UI, not programmatically via API. Each webhook requires a custom username and a destination webhook URL. Only one entity type (Mail, Tasks, or Streams Post) can be selected per webhook configuration.
