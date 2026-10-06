# Lemlist API coverage

The API base is `https://api.lemlist.com/api`. Authentication uses HTTP Basic with an empty username and the API key as password. The key identifies its team; Get Team Info discovers that identity and its credit balance. Account onboarding verifies the team before saving credentials.

## Supported workflows

The 17 tools cover campaign creation/list/read/update/start/pause and date-range statistics; campaign lead creation, email lookup, bounded listing, field updates, interest and pause/resume actions, and removal; paginated activity history; People database search and API filter discovery; campaign sequence/branch discovery; and current variable/contact subscription status and changes.

Campaign and activity lists use offset/limit. Campaign lead listing accepts a maximum of 500 and has no documented continuation mechanism: a full result sets possiblyTruncated. People searches use page/size, up to 100 per page, and the plan's 24-hour query allowance. Work history is returned explicitly; omitted current-job details are not inferred from historical entries.

Campaign creation also persists an empty sequence and schedule. The public reference does not document a campaign delete endpoint. Starting a campaign or resuming a lead can launch outreach. Lead creation may create or update a global contact and company, and company updates may affect every lead sharing that company. Enrichment options can spend credits. Responses retain non-blocking field/company warnings. Combined updates and actions run sequentially, so an earlier write can remain applied when a later action fails.

By default, Remove Lead from Campaign unsubscribes the campaign lead using its email. PermanentlyDelete sends action=remove and removes the campaign lead record; the separate global contact may remain. Subscription changes can enable or suppress communication and must be applied intentionally.

## Subscription migration

Manage Subscriptions uses the current `/v2/unsubscribes/variables` and `/v2/unsubscribes/contacts` endpoints. Variables include email, @domain, phone and LinkedIn URL. A contact opt-out blocks all channels, independently of variable opt-outs. Protected variable sources lead and abuse cannot be re-subscribed. Missing-variable GET 404 means absent; missing contacts and other failures are errors. Mutation responses may be plain strings or JSON, so current state is verified by GET rather than exact response text.

The original Manage Unsubscribes key and its schemas remain available and deprecated. Official guidance schedules the legacy `/unsubscribes` endpoints to stop working on **November 1, 2026**; use Manage Subscriptions for current workflows. This is a feature-specific sunset, not a provider retirement.

## Boundaries

This integration does not administer inbox messaging, CRM connections, email accounts, warmup, companies, tasks, signal agents, schedules or sequence editing. It does not install webhook subscriptions. No file-export endpoint is exposed. The provider limits API keys to 20 requests per two seconds; respect Retry-After when rate-limited. Writes are never retried automatically, and authenticated redirects are rejected.

## Official references

- [API authentication](https://developer.lemlist.com/api-reference/getting-started/authentication)
- [Endpoint catalogue](https://developer.lemlist.com/llms.txt)
- [Rate limits](https://developer.lemlist.com/api-reference/getting-started/rate-limits)
- [Lead creation](https://developer.lemlist.com/api-reference/endpoints/leads/create-lead-in-campaign)
- [Lead removal](https://developer.lemlist.com/api-reference/endpoints/leads/delete-lead)
- [Campaign sequences](https://developer.lemlist.com/api-reference/endpoints/sequences/get-campaign-sequences)
- [Database filter definitions](https://developer.lemlist.com/api-reference/endpoints/people-database/get-database-filters)
- [Current unsubscribe migration](https://help.lemlist.com/en/articles/16945592-migrate-from-the-legacy-unsubscribe-endpoints-to-the-v2-unsubscribe-api)
