# Retently

Manage customers, survey delivery, and feedback analytics using the [Retently REST API v2](https://www.retently.com/docs/api/).

## Authentication

API keys use the recommended `X-Api-Key` header. Create a key under Settings > API > Tokens. Read keys can call GET endpoints; write keys are required for customer, feedback, survey, and suppression changes. The existing OAuth connection method is retained for compatibility.

## Capabilities

- Identify the connected account and inspect its plan, survey credits, and usage.
- List and retrieve customers and companies. Customer writes merge supplied profile fields, properties, and tags; optionally remove selected properties and tags. Create or update at most 1,000 customers per request.
- List campaigns and templates; retrieve a template's questions and stable question UUIDs.
- Queue transactional surveys for up to 100 recipients. Campaigns must be active and transactional. An explicit delay overrides campaign scheduling; omit it to respect the configured sending time frame. Acceptance into the queue does not establish delivery.
- List or retrieve feedback, annotate topics and tags, and import up to 200 historical primary scores/comments per batch. Import results include failed and skipped rows; imported responses affect scores and trends. Set response dates for historical data and use an idempotency key for retries.
- Retrieve overall NPS, CSAT, CES, or STAR scores, campaign reports, trend groups and trends, and survey outbox records.
- List, add, and remove email/domain suppressions. Only manually added suppressions can be removed. Write results retain entry IDs.
- Unsubscribe customers or resubscribe owner-unsubscribed contacts. Self-unsubscribed and bounced contacts remain protected; results expose skipped or missing contacts and account-level email suppression flags.
- Queue customer attribute snapshot refreshes for explicit customer IDs or emails after updating customers. Refreshes are asynchronous; read feedback or outbox records later to observe completion.

## Filtering and dates

Customer, feedback, and outbox attribute filters use the public `operator` input, sent as the provider's `attributes[index][op]` query parameter. Page values are positive integers; limits range from 1 to 1,000.

Customer and feedback date bounds are exact UTC instants and accept calendar dates, ISO 8601 timestamps, or UNIX seconds. Include a full final-day timestamp when needed. Outbox bounds cover whole days in the account timezone. Reports require YYYY-MM-DD dates. Custom trend ranges use `date=custom` and accept YYYY-MM-DD or ISO 8601 values, not UNIX timestamps.

## Limits

The provider documents 150 requests per minute. This integration exposes no webhook triggers. Historical imports currently cover primary score/comment and customer profile metadata; additional question answers and filter-based snapshot backfills are outside this tool surface.
