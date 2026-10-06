# Drip API coverage

Current official reference: https://developer.drip.com/

The integration uses fixed HTTPS `api.getdrip.com` REST v2 and Shopper Activity v3 routes. Authentication supports personal-token Basic auth and public OAuth Bearer tokens with the documented public scope. OAuth authorization/exchange remains on `www.getdrip.com`; the provider documents nonexpiring tokens rather than a refresh flow.

Account discovery and user identity are read-only. Account operations accept an optional discovery-derived account input, falling back to saved settings for existing connections. Subscriber CRUD, tags, opt-outs, campaign/workflow control, event recording and existing collection keys retain their schemas. Two additional read tools expose current user and campaign memberships. There are no inbound triggers or replacement registrations.

Requests use bounded timeouts and reject redirects. Failures expose validated status and actionable guidance without retaining upstream credential/body/configuration state. Required resource collections and synchronous completion responses are checked. Optional null resource fields are omitted without fabricating IDs or missing data. User-defined custom-field values retain their types.

Campaign, workflow, broadcast and subscriber/event collection responses expose pagination when supplied. Sorting uses `sort`/`direction`. Conversion paging selectors remain accepted for compatibility but are not documented provider capabilities. Form headlines map from `headline`.

Shopper batches accept one activity and return queued request IDs. The tools expose acceptance and optional partial errors while leaving completion unconfirmed. Existing currencyCode maps to `currency`, address ZIP fields to `postal_code`, and product variants default to product IDs only for a one-variant product as documented. No status endpoint, history deletion, cancellation, catalog readback or refund guarantee is invented.

Private verification requires a dedicated synthetic account and independently matched user/account identity. Subscriber writes, retained events, automation state and shopper/catalog effects have separate explicit fixture gates. Every disposable subscriber uses exact run identity and preregistered cleanup. Controlled automation state is restored to paused; shopper fixtures are retained while queued effects may remain unresolved.
