# AgentMail API - Comprehensive Documentation

## Base Information

### Base URLs

- **Primary**: `https://api.agentmail.to`
- **Alternative endpoints**:
  - `https://x402.api.agentmail.to`
  - `https://mpp.api.agentmail.to`
  - `https://api.agentmail.eu`

### API Version

- Current version: `v0`
- All endpoints are prefixed with `/v0/`

### Authentication

- **Method**: Bearer token authentication
- **Header**: `Authorization: Bearer <api_key>`
- Uses API keys (no complex OAuth flows)

### Rate Limiting

- High-volume ready with no restrictive rate or sending limits mentioned
- Specific thresholds not documented

---

## Core Data Models

### Inbox

```typescript
{
  inbox_id: string;           // Required - Unique identifier
  pod_id: string;             // Required - Associated pod identifier
  display_name?: string;      // Optional - Format: "Display Name <username@domain.com>"
  client_id?: string;         // Optional - Client identifier
  created_at: string;         // Required - ISO 8601 timestamp
  updated_at: string;         // Required - ISO 8601 timestamp
}
```

### Message

```typescript
{
  message_id: string;              // Required - Unique identifier
  inbox_id: string;                // Required - Parent inbox
  thread_id: string;               // Required - Associated thread
  labels: string[];                // Required - Message labels
  timestamp: string;               // Required - ISO 8601 datetime
  from: string;                    // Required - Sender address
  to: string[];                    // Required - Recipients
  cc?: string[];                   // Optional - CC recipients
  bcc?: string[];                  // Optional - BCC recipients
  reply_to?: string[];             // Optional - Reply-to addresses
  subject?: string;                // Optional - Subject line
  preview?: string;                // Optional - Text preview
  text?: string;                   // Optional - Plain text body
  html?: string;                   // Optional - HTML body
  extracted_text?: string;         // Optional - Parsed text content
  extracted_html?: string;         // Optional - Parsed HTML content
  attachments?: Attachment[];      // Optional - Array of attachments
  headers?: Record<string, string>; // Optional - Custom headers
  in_reply_to?: string;            // Optional - Message ID being replied to
  references?: string[];           // Optional - Thread references
  size: number;                    // Required - Size in bytes
  created_at: string;              // Required - ISO 8601 timestamp
  updated_at: string;              // Required - ISO 8601 timestamp
}
```

### Thread

```typescript
{
  thread_id: string;               // Required - Unique identifier
  inbox_id: string;                // Required - Parent inbox
  labels: string[];                // Required - Thread labels
  timestamp: string;               // Required - Last activity timestamp
  received_timestamp?: string;     // Optional - Last received message time
  sent_timestamp?: string;         // Optional - Last sent message time
  senders: string[];               // Required - Participant senders
  recipients: string[];            // Required - Participant recipients
  subject?: string;                // Optional - Thread subject
  preview?: string;                // Optional - Text preview
  attachments?: Attachment[];      // Optional - All attachments in thread
  message_count: number;           // Required - Total messages in thread
  last_message_id: string;         // Required - Most recent message ID
  size: number;                    // Required - Total size in bytes
  messages: Message[];             // Required - Ordered by timestamp ascending
  created_at: string;              // Required - ISO 8601 timestamp
  updated_at: string;              // Required - ISO 8601 timestamp
}
```

### Draft

```typescript
{
  draft_id: string;                // Required - Unique identifier
  inbox_id: string;                // Required - Parent inbox
  client_id?: string;              // Optional - Client identifier
  labels?: string[];               // Optional - Draft labels
  to: string[];                    // Required - Recipients
  cc?: string[];                   // Optional - CC recipients
  bcc?: string[];                  // Optional - BCC recipients
  reply_to?: string[];             // Optional - Reply-to addresses
  subject?: string;                // Optional - Subject line
  preview?: string;                // Optional - Text preview
  text?: string;                   // Optional - Plain text body
  html?: string;                   // Optional - HTML body
  attachments?: Attachment[];      // Optional - Attachments
  in_reply_to?: string;            // Optional - Message ID being replied to
  references?: string[];           // Optional - Thread references
  send_status?: string;            // Optional - "scheduled" | "sending" | "failed"
  send_at?: string;                // Optional - ISO 8601 scheduled send time
  created_at: string;              // Required - ISO 8601 timestamp
  updated_at: string;              // Required - ISO 8601 timestamp
}
```

### Attachment

```typescript
{
  attachment_id: string;                      // Required - Unique identifier
  filename: string;                           // Required - Original filename
  size: number;                               // Required - Size in bytes
  content_type?: string;                      // Optional - MIME type
  content_disposition?: "inline" | "attachment"; // Optional - Display mode
  content_id?: string;                        // Optional - Content-ID header
}
```

### AttachmentResponse (extends Attachment)

```typescript
{
  attachment_id: string;
  filename: string;
  size: number;
  content_type?: string;
  content_disposition?: "inline" | "attachment";
  content_id?: string;
  download_url: string;          // Required - Presigned S3 URL
  expires_at: string;            // Required - ISO 8601 expiration time
}
```

### Domain

```typescript
{
  domain_id: string;             // Required - Unique identifier
  pod_id?: string;               // Optional - Associated pod
  domain: string;                // Required - Domain name (e.g., "example.com")
  status: DomainStatus;          // Required - Verification status
  feedback_enabled: boolean;     // Required - Bounce/complaint notifications
  records?: DnsRecord[];         // Optional - DNS verification records
  client_id?: string;            // Optional - Client identifier
  created_at: string;            // Required - ISO 8601 timestamp
  updated_at: string;            // Required - ISO 8601 timestamp
}

// DomainStatus enum
type DomainStatus =
  | "NOT_STARTED"
  | "PENDING"
  | "INVALID"
  | "FAILED"
  | "VERIFYING"
  | "VERIFIED";

// DnsRecord
type DnsRecord = {
  type: string;        // e.g., "TXT", "MX", "CNAME"
  name: string;        // Record name
  value: string;       // Record value
  status: string;      // Verification status
  priority?: number;   // For MX records
};
```

### Pod

```typescript
{
  pod_id: string;                // Required - Unique identifier
  name: string;                  // Required - Pod name
  client_id?: string;            // Optional - Client identifier
  created_at: string;            // Required - ISO 8601 timestamp
  updated_at: string;            // Required - ISO 8601 timestamp
}
```

### Webhook

```typescript
{
  webhook_id: string;            // Required - Unique identifier
  url: string;                   // Required - Webhook endpoint URL
  event_types: string[];         // Required - Subscribed event types
  secret: string;                // Required - Signature verification secret
  enabled: boolean;              // Required - Activation status
  pod_ids?: string[];            // Optional - Scoped to specific pods (max 10)
  inbox_ids?: string[];          // Optional - Scoped to specific inboxes (max 10)
  client_id?: string;            // Optional - Client identifier
  created_at: string;            // Required - ISO 8601 timestamp
  updated_at: string;            // Required - ISO 8601 timestamp
}
```

### ListEntry

```typescript
{
  entry: string;                           // Required - Email or domain
  organization_id: string;                 // Required - Organization ID
  reason?: string;                         // Optional - Reason for entry
  direction: "send" | "receive";           // Required - Email flow direction
  list_type: "allow" | "block";            // Required - List type
  entry_type: "email" | "domain";          // Required - Auto-detected type
  created_at: string;                      // Required - ISO 8601 timestamp
}
```

### ApiKey

```typescript
{
  api_key_id: string;            // Required - Unique identifier
  api_key?: string;              // Only returned on creation
  prefix: string;                // Required - Key prefix for identification
  name: string;                  // Required - Human-readable name
  pod_id?: string;               // Optional - Pod scope
  used_at?: string;              // Optional - Last usage timestamp
  created_at: string;            // Required - ISO 8601 timestamp
}
```

---

## API Endpoints

### Inboxes

#### List Inboxes

```
GET /v0/inboxes
```

**Query Parameters:**

- `limit` (integer, optional) - Items per page
- `page_token` (string, optional) - Pagination cursor
- `ascending` (boolean, optional) - Sort direction

**Response (200):**

```typescript
{
  count: number;
  limit?: number;
  next_page_token?: string;
  inboxes: Inbox[];  // Ordered by created_at descending
}
```

#### Create Inbox

```
POST /v0/inboxes
```

**Request Body:**

```typescript
{
  username?: string;      // Auto-generated if omitted
  domain?: string;        // Defaults to "agentmail.to"
  display_name?: string;  // Format: "Display Name <username@domain.com>"
  client_id?: string;     // Client identifier
}
```

**Response (200):** `Inbox` object

#### Get Inbox

```
GET /v0/inboxes/{inbox_id}
```

**Response (200):** `Inbox` object

#### Update Inbox

```
PATCH /v0/inboxes/{inbox_id}
```

**Request Body:**

```typescript
{
  display_name: string; // Required - "Display Name <username@domain.com>"
}
```

**Response (200):** `Inbox` object

#### Delete Inbox

```
DELETE /v0/inboxes/{inbox_id}
```

**Response (200):** Success

---

### Messages

#### List Messages

```
GET /v0/inboxes/{inbox_id}/messages
```

**Query Parameters:**

- `limit` (integer, optional) - Items per page
- `page_token` (string, optional) - Pagination cursor
- `labels` (string[], optional) - Filter by labels
- `before` (datetime, optional) - Upper timestamp bound
- `after` (datetime, optional) - Lower timestamp bound
- `ascending` (boolean, optional) - Sort direction
- `include_spam` (boolean, optional) - Include spam messages
- `include_blocked` (boolean, optional) - Include blocked messages
- `include_trash` (boolean, optional) - Include trash messages

**Response (200):**

```typescript
{
  count: number;
  limit?: number;
  next_page_token?: string;
  messages: Message[];  // Ordered by timestamp descending
}
```

#### Get Message

```
GET /v0/inboxes/{inbox_id}/messages/{message_id}
```

**Response (200):** `Message` object

#### Send Message

```
POST /v0/inboxes/{inbox_id}/messages/send
```

**Request Body:**

```typescript
{
  to: string | string[];           // Required - Recipients
  cc?: string | string[];          // Optional - CC recipients
  bcc?: string | string[];         // Optional - BCC recipients
  reply_to?: string | string[];    // Optional - Reply-to addresses
  subject?: string;                // Optional - Subject line
  text?: string;                   // Optional - Plain text body
  html?: string;                   // Optional - HTML body
  labels?: string[];               // Optional - Message labels
  attachments?: {                  // Optional - Attachments
    filename: string;
    content_type?: string;
    content_disposition?: "inline" | "attachment";
    content_id?: string;
    content?: string;              // Base64 encoded content
    url?: string;                  // Alternative to content
  }[];
  headers?: Record<string, string>; // Optional - Custom headers
}
```

**Response (200):**

```typescript
{
  message_id: string;
  thread_id: string;
}
```

#### Reply to Message

```
POST /v0/inboxes/{inbox_id}/messages/{message_id}/reply
```

**Request Body:**

```typescript
{
  text?: string;                   // Optional - Plain text body
  html?: string;                   // Optional - HTML body
  reply_all?: boolean;             // Optional - Reply to all recipients
  to?: string | string[];          // Optional - Additional recipients
  cc?: string | string[];          // Optional - CC recipients
  bcc?: string | string[];         // Optional - BCC recipients
  reply_to?: string | string[];    // Optional - Reply-to addresses
  attachments?: Attachment[];      // Optional - Attachments
  headers?: Record<string, string>; // Optional - Custom headers
  labels?: string[];               // Optional - Message labels
}
```

**Response (200):**

```typescript
{
  message_id: string;
  thread_id: string;
}
```

#### Reply All to Message

```
POST /v0/inboxes/{inbox_id}/messages/{message_id}/reply-all
```

Same request/response as Reply to Message.

#### Forward Message

```
POST /v0/inboxes/{inbox_id}/messages/{message_id}/forward
```

Similar request body structure as Send Message.

**Response (200):**

```typescript
{
  message_id: string;
  thread_id: string;
}
```

#### Update Message

```
PATCH /v0/inboxes/{inbox_id}/messages/{message_id}
```

**Request Body:**

```typescript
{
  add_labels?: string[];     // Optional - Labels to add
  remove_labels?: string[];  // Optional - Labels to remove
}
```

**Response (200):** `Message` object

#### Get Message Raw

```
GET /v0/inboxes/{inbox_id}/messages/{message_id}/raw
```

Downloads raw .eml file.

---

### Threads

#### List Threads

```
GET /v0/inboxes/{inbox_id}/threads
```

**Query Parameters:**

- `limit` (integer, optional) - Items per page
- `page_token` (string, optional) - Pagination cursor
- `labels` (string[], optional) - Filter by labels
- `before` (datetime, optional) - Upper timestamp bound
- `after` (datetime, optional) - Lower timestamp bound
- `ascending` (boolean, optional) - Sort direction
- `include_spam` (boolean, optional) - Include spam threads
- `include_blocked` (boolean, optional) - Include blocked threads
- `include_trash` (boolean, optional) - Include trash threads

**Response (200):**

```typescript
{
  count: number;
  limit?: number;
  next_page_token?: string;
  threads: Thread[];  // Ordered by timestamp descending
}
```

#### Get Thread

```
GET /v0/inboxes/{inbox_id}/threads/{thread_id}
```

**Response (200):** `Thread` object with full `messages` array ordered by timestamp ascending

#### Delete Thread

```
DELETE /v0/inboxes/{inbox_id}/threads/{thread_id}
```

Deletes thread (moves to trash or permanently deletes).

---

### Drafts

#### List Drafts

```
GET /v0/inboxes/{inbox_id}/drafts
```

**Query Parameters:**

- `limit` (integer, optional) - Items per page
- `page_token` (string, optional) - Pagination cursor
- `ascending` (boolean, optional) - Sort direction

**Response (200):**

```typescript
{
  count: number;
  limit?: number;
  next_page_token?: string;
  drafts: Draft[];
}
```

#### Create Draft

```
POST /v0/inboxes/{inbox_id}/drafts
```

**Request Body:**

```typescript
{
  labels?: string[];               // Optional - Draft labels
  reply_to?: string[];             // Optional - Reply-to addresses
  to: string[];                    // Required - Recipients
  cc?: string[];                   // Optional - CC recipients
  bcc?: string[];                  // Optional - BCC recipients
  subject?: string;                // Optional - Subject line
  text?: string;                   // Optional - Plain text body
  html?: string;                   // Optional - HTML body
  attachments?: {                  // Optional - Attachments
    filename: string;
    content_type?: string;
    content_disposition?: "inline" | "attachment";
    content_id?: string;
    content?: string;              // Base64 encoded
    url?: string;                  // Alternative to content
  }[];
  in_reply_to?: string;            // Optional - Message ID
  send_at?: string;                // Optional - ISO 8601 scheduled send time
  client_id?: string;              // Optional - Client identifier
}
```

**Response (200):** `Draft` object

#### Get Draft

```
GET /v0/inboxes/{inbox_id}/drafts/{draft_id}
```

**Response (200):** `Draft` object

#### Update Draft

```
PATCH /v0/inboxes/{inbox_id}/drafts/{draft_id}
```

Same request body as Create Draft.

**Response (200):** `Draft` object

#### Delete Draft

```
DELETE /v0/inboxes/{inbox_id}/drafts/{draft_id}
```

**Response (200):** Success

#### Send Draft

```
POST /v0/inboxes/{inbox_id}/drafts/{draft_id}/send
```

**Request Body:**

```typescript
{
  add_labels?: string[];     // Optional - Labels to add
  remove_labels?: string[];  // Optional - Labels to remove
}
```

**Response (200):**

```typescript
{
  message_id: string;
  thread_id: string;
}
```

---

### Attachments

#### Get Message Attachment

```
GET /v0/inboxes/{inbox_id}/messages/{message_id}/attachments/{attachment_id}
```

**Response (200):** `AttachmentResponse` object with presigned download URL

#### Get Thread Attachment

```
GET /v0/inboxes/{inbox_id}/threads/{thread_id}/attachments/{attachment_id}
```

**Response (200):** `AttachmentResponse` object with presigned download URL

---

### Domains

#### List Domains

```
GET /v0/domains
```

**Query Parameters:**

- `limit` (integer, optional) - Items per page
- `page_token` (string, optional) - Pagination cursor
- `ascending` (boolean, optional) - Sort direction

**Response (200):**

```typescript
{
  count: number;
  limit?: number;
  next_page_token?: string;
  domains: Domain[];
}
```

#### Create Domain

```
POST /v0/domains
```

**Request Body:**

```typescript
{
  domain: string; // Required - Domain name (e.g., "example.com")
  feedback_enabled: boolean; // Required - Enable bounce/complaint notifications
}
```

**Response (200):** `Domain` object

#### Get Domain

```
GET /v0/domains/{domain_id}
```

**Response (200):** `Domain` object

#### Update Domain

```
PATCH /v0/domains/{domain_id}
```

**Request Body:** (Schema not fully documented, likely similar to Create)

**Response (200):** `Domain` object

#### Delete Domain

```
DELETE /v0/domains/{domain_id}
```

**Response (200):** Success

#### Get Zone File

```
GET /v0/domains/{domain_id}/zone-file
```

Returns DNS zone file in binary format.

#### Verify Domain

```
POST /v0/domains/{domain_id}/verify
```

Triggers domain verification process.

**Response (200):** `Domain` object with updated verification status

---

### Lists (Allowlist/Blocklist)

#### List Entries

```
GET /v0/lists/{direction}/{type}
```

**Path Parameters:**

- `direction`: `"send"` | `"receive"` - Email flow direction
- `type`: `"allow"` | `"block"` - List type

**Query Parameters:**

- `limit` (integer, optional) - Items per page
- `page_token` (string, optional) - Pagination cursor
- `ascending` (boolean, optional) - Sort direction

**Response (200):**

```typescript
{
  count: number;
  limit?: number;
  next_page_token?: string;
  entries: ListEntry[];
}
```

#### Create List Entry

```
POST /v0/lists/{direction}/{type}
```

**Path Parameters:**

- `direction`: `"send"` | `"receive"`
- `type`: `"allow"` | `"block"`

**Request Body:**

```typescript
{
  entry: string;     // Required - Email address or domain
  reason?: string;   // Optional - Reason for adding entry
}
```

**Response (200):** `ListEntry` object

#### Get List Entry

```
GET /v0/lists/{direction}/{type}/{entry}
```

**Response (200):** `ListEntry` object

#### Delete List Entry

```
DELETE /v0/lists/{direction}/{type}/{entry}
```

**Response (200):** Success

---

### Pods

#### List Pods

```
GET /v0/pods
```

**Query Parameters:**

- `limit` (integer, optional) - Items per page
- `page_token` (string, optional) - Pagination cursor
- `ascending` (boolean, optional) - Sort direction

**Response (200):**

```typescript
{
  count: number;
  limit?: number;
  next_page_token?: string;
  pods: Pod[];
}
```

#### Create Pod

```
POST /v0/pods
```

**Request Body:**

```typescript
{
  name?: string;       // Optional - Pod name
  client_id?: string;  // Optional - Client identifier
}
```

**Response (200):** `Pod` object

#### Get Pod

```
GET /v0/pods/{pod_id}
```

**Response (200):** `Pod` object

#### Delete Pod

```
DELETE /v0/pods/{pod_id}
```

**Response (200):** Success

---

### Pod-Scoped Endpoints

All inbox/message/thread/draft/domain/list endpoints can be scoped to a pod by prefixing with `/v0/pods/{pod_id}/`:

- `/v0/pods/{pod_id}/inboxes`
- `/v0/pods/{pod_id}/inboxes/{inbox_id}/messages`
- `/v0/pods/{pod_id}/inboxes/{inbox_id}/threads`
- `/v0/pods/{pod_id}/inboxes/{inbox_id}/drafts`
- `/v0/pods/{pod_id}/domains`
- `/v0/pods/{pod_id}/lists/{direction}/{type}`
- `/v0/pods/{pod_id}/metrics`
- `/v0/pods/{pod_id}/api-keys`

The endpoint structure and parameters remain the same.

---

### Webhooks

#### List Webhooks

```
GET /v0/webhooks
```

**Query Parameters:**

- `limit` (integer, optional) - Items per page
- `page_token` (string, optional) - Pagination cursor
- `ascending` (boolean, optional) - Sort direction

**Response (200):**

```typescript
{
  count: number;
  limit?: number;
  next_page_token?: string;
  webhooks: Webhook[];
}
```

#### Create Webhook

```
POST /v0/webhooks
```

**Request Body:**

```typescript
{
  url: string;                // Required - Webhook endpoint URL
  event_types: string[];      // Required - Event types to subscribe to
  pod_ids?: string[];         // Optional - Scope to pods (max 10)
  inbox_ids?: string[];       // Optional - Scope to inboxes (max 10)
  client_id?: string;         // Optional - Client identifier
}
```

**Available Event Types:**

- `"message.received"`
- `"message.sent"`
- `"message.delivered"`
- `"message.bounced"`
- `"message.complained"`
- `"message.rejected"`
- `"domain.verified"`

**Response (200):** `Webhook` object (includes `secret` for signature verification)

#### Get Webhook

```
GET /v0/webhooks/{webhook_id}
```

**Response (200):** `Webhook` object

#### Update Webhook

```
PATCH /v0/webhooks/{webhook_id}
```

**Request Body:** Similar to Create Webhook

**Response (200):** `Webhook` object

#### Delete Webhook

```
DELETE /v0/webhooks/{webhook_id}
```

**Response (200):** Success

---

### Webhook Events

#### Event Structure

All webhook events are sent with these HTTP headers:

- `svix-id`: Webhook message identifier
- `svix-signature`: Message signature for verification
- `svix-timestamp`: ISO 8601 timestamp of webhook dispatch

#### Message Received Event

**Payload:**

```typescript
{
  type: 'event';
  event_type: 'message.received';
  event_id: string;
  message: Message; // Full message object
  thread: Thread; // Thread context (without messages array)
}
```

Other event types (message.sent, message.delivered, etc.) follow a similar structure.

---

### Metrics

#### Query Account Metrics

```
GET /v0/metrics
```

#### Query Inbox Metrics

```
GET /v0/inboxes/{inbox_id}/metrics
```

#### Query Pod Metrics

```
GET /v0/pods/{pod_id}/metrics
```

**Query Parameters:**

- `event_types` (string[], optional) - Filter by event types
- `start` (datetime, optional) - Query window start
- `end` (datetime, optional) - Query window end
- `period` (string, optional) - Aggregation interval in seconds
- `limit` (integer, optional) - Max number of buckets
- `descending` (boolean, optional) - Sort order

**Available Event Types:**

- `"message.sent"`
- `"message.delivered"`
- `"message.bounced"`
- `"message.delayed"`
- `"message.rejected"`
- `"message.complained"`
- `"message.received"`

**Response (200):**

```typescript
{
  [event_type: string]: {
    timestamp: string;  // ISO 8601
    count: number;
  }[];
}
```

---

### API Keys

#### List API Keys

```
GET /v0/api-keys
```

**Query Parameters:**

- `limit` (integer, optional) - Items per page
- `page_token` (string, optional) - Pagination cursor
- `ascending` (boolean, optional) - Sort direction

**Response (200):**

```typescript
{
  count: number;
  limit?: number;
  next_page_token?: string;
  api_keys: ApiKey[];  // Ordered by created_at descending
}
```

#### Create API Key

```
POST /v0/api-keys
```

**Request Body:**

```typescript
{
  name: string; // Required - Human-readable name
}
```

**Response (200):** `ApiKey` object (includes `api_key` field only on creation)

#### Delete API Key

```
DELETE /v0/api-keys/{api_key}
```

**Response (200):** Success

---

### Organization

#### Get Current Organization

```
GET /v0/organizations
```

**Response (200):** Organization object (schema not fully documented)

---

## Common Response Patterns

### Success Response (200)

Returns the requested resource object or list response.

### Validation Error (400)

```typescript
{
  name: string;
  errors: any; // Validation error details
}
```

### Forbidden (403)

```typescript
{
  name: string;
  message: string;
}
```

### Not Found (404)

```typescript
{
  name: string;
  message: string;
}
```

### List Response Pattern

```typescript
{
  count: number;              // Items returned in current page
  limit?: number;             // Items per page
  next_page_token?: string;   // Cursor for next page
  [resource_array]: T[];      // Array of resources
}
```

---

## Pagination

All list endpoints support cursor-based pagination:

1. **Request**: Include `limit` and optional `page_token` query parameters
2. **Response**: Returns `count`, `limit`, `next_page_token`, and items array
3. **Next Page**: Use `next_page_token` value as `page_token` in next request
4. **End**: When `next_page_token` is absent, you've reached the last page

**Sorting:**

- Default: Descending order (newest first)
- Use `ascending=true` to reverse order

---

## Filtering

Message and Thread list endpoints support:

- **labels**: Filter by one or more labels
- **before**: Upper timestamp bound (exclusive)
- **after**: Lower timestamp bound (exclusive)
- **include_spam**: Include spam-labeled items (default: false)
- **include_blocked**: Include blocked items (default: false)
- **include_trash**: Include trash items (default: false)

---

## Email Address Format

Email addresses can be in two formats:

- Simple: `"user@example.com"`
- Display: `"Display Name <user@example.com>"`

Both formats are accepted in all `to`, `cc`, `bcc`, `from`, and `reply_to` fields.

---

## Attachments

### Sending Attachments

When sending messages or creating drafts, attachments can be provided in two ways:

1. **Base64 Content:**

```typescript
{
  filename: "document.pdf",
  content_type: "application/pdf",
  content_disposition: "attachment",
  content: "base64EncodedDataHere..."
}
```

2. **URL Reference:**

```typescript
{
  filename: "image.jpg",
  content_type: "image/jpeg",
  content_disposition: "inline",
  content_id: "image1",
  url: "https://example.com/image.jpg"
}
```

### Receiving Attachments

Attachment metadata is included in Message and Thread objects. To download:

1. Call the attachment endpoint (e.g., `GET /v0/inboxes/{inbox_id}/messages/{message_id}/attachments/{attachment_id}`)
2. Response includes `download_url` (presigned S3 URL) and `expires_at`
3. Download file from the presigned URL before expiration

---

## Labels

Labels are used for:

- Message/thread organization
- Filtering and searching
- State management
- Campaign tracking

**System Labels** (commonly used, though full list not documented):

- Likely include: INBOX, SENT, TRASH, SPAM, DRAFT

**Custom Labels:**

- User-defined strings
- Added/removed via `add_labels` and `remove_labels` operations
- Can be applied to messages and threads

---

## Multi-Tenancy with Pods

Pods provide multi-tenant isolation:

1. **Create a Pod** for each tenant
2. **Scope resources** by using pod-scoped endpoints
3. **Isolate data** - resources in one pod are separate from another
4. **Manage independently** - each pod can have its own inboxes, domains, API keys, etc.

**Pod-scoped endpoints** follow the pattern:

```
/v0/pods/{pod_id}/[resource]
```

---

## Custom Domains

### Setup Process

1. **Create Domain**: `POST /v0/domains` with domain name
2. **Get DNS Records**: Response includes `records` array with DNS requirements
3. **Configure DNS**: Add the required records to your DNS provider
4. **Verify Domain**: `POST /v0/domains/{domain_id}/verify`
5. **Check Status**: Domain `status` will be "VERIFIED" when successful

### DNS Records

Domain creation returns records array with:

- **type**: Record type (TXT, MX, CNAME)
- **name**: Record name
- **value**: Record value
- **status**: Verification status
- **priority**: For MX records

### Zone File

Get complete DNS zone file: `GET /v0/domains/{domain_id}/zone-file`

---

## Webhook Verification

Webhooks use Svix for signature verification:

**Headers:**

- `svix-id`: Message ID
- `svix-signature`: HMAC signature
- `svix-timestamp`: Timestamp

**Verification:**
Use the `secret` from webhook creation to verify signatures. See Svix documentation for implementation details.

---

## Best Practices

1. **Rate Limiting**: Though not documented, implement exponential backoff for retries
2. **Pagination**: Always paginate large result sets using `limit` and `page_token`
3. **Webhook Verification**: Always verify webhook signatures before processing
4. **Error Handling**: Handle 400, 403, and 404 responses appropriately
5. **Attachment URLs**: Download from presigned URLs before they expire
6. **Labels**: Use consistent label naming conventions for better organization
7. **Multi-tenancy**: Use pods for proper tenant isolation
8. **Domain Setup**: Verify DNS records are properly configured before sending

---

## SDK Support

Official SDKs available:

- **TypeScript/Node.js** - GitHub
- **Python** - GitHub

Both SDKs provide typed interfaces for all endpoints and models.

---

## Additional Resources

- **Console**: https://console.agentmail.to
- **Documentation**: https://docs.agentmail.to
- **API Reference**: https://docs.agentmail.to/api-reference
- **OpenAPI Spec**:
  - JSON: https://docs.agentmail.to/openapi.json
  - YAML: https://docs.agentmail.to/openapi.yaml
- **Discord**: https://discord.gg/hTYatWYWBc
- **Email Support**: support@agentmail.cc

---

## Notes

- No search endpoints documented - filtering is done through list operations
- No batch operations documented - operations are resource-specific
- WebSocket connections mentioned but not fully documented in API reference
- Some schemas (Organization, complete webhook event payloads) not fully documented
- API is in v0, so breaking changes may occur
