# Dripcel

Dripcel provides contact management, SMS and email sends, campaign reporting, compliance checks, and a campaign exchange for performance marketing.

## Authentication

Use an organization API key from the [API keys page](https://app.dripcel.com/api-keys), sent as a Bearer token. Keys have configurable permissions; grant only those needed by the selected operations. See the [API overview](https://docs.dripcel.com/API/overview).

## Contact workflows

Get contacts by cell number, search with at least one filter, upload new contacts or upsert existing contacts, manage tags and opt-outs, bulk-update segmentation, and delete contacts. Contact searches cost 10 credits per request. Set `fields` to request a projection; otherwise the API returns only contact IDs. Create-only uploads allow 100,000 contacts, while upserts allow 20,000.

Contact uploads return numeric valid/rejected counts and available rejected-row details. Optional welcome sends support the documented `send.template` object with `kind: manual` and `data.template_id`. The older `send.content` field remains available for compatibility, but its provider acceptance is not established by current public docs. Use one welcome-send format per upload. Bulk updates must separate additions from removals. See [Contacts](https://docs.dripcel.com/API/contacts).

## Messaging and reporting

Send an SMS, optionally using test mode, and track the returned customer ID through delivery lookups. Send bulk email from a verified sender using an existing template, optionally scheduling delivery and filtering recipients to known contacts. List email templates, inspect legacy or V2 campaigns, search send logs, and search replies by campaign, number, classification, date, or the send being replied to.

`list_campaigns` reads legacy campaigns; `list_campaigns_v2` reads the separate newer model with full targeting, channel, and marketplace details. Neither model is deprecated by this integration. The public email-template API documents listing; mutation request contracts are not published there.

See [Send](https://docs.dripcel.com/API/send), [Deliveries](https://docs.dripcel.com/API/deliveries), [Email templates](https://docs.dripcel.com/API/email-templates), [Campaigns](https://docs.dripcel.com/API/campaigns), [Send logs](https://docs.dripcel.com/API/send-logs), and [Replies](https://docs.dripcel.com/API/replies).

## Sales, compliance, and marketplace

Upload sale conversions; duplicates are rejected. V2 campaigns require international cell-number format. Check compliance before sending; this costs 0.14 credits per queried number. Check the organization credit balance.

Use `create_exchange_transactions` to submit 1 to 1,000 marketplace leads as a buyer. Each lead requires a unique resource ID, a cell number, and exactly one campaign, send, or click identifier. The requested initial status can be overridden by duplicate detection or offer caps. Completed transactions deduct credits; search through `manage_exchange_transactions` to confirm the resulting status, or accept/reject pending transactions.

See [Sales](https://docs.dripcel.com/API/sales), [Compliance](https://docs.dripcel.com/API/compliance), [Credit balance](https://docs.dripcel.com/API/balance), [Exchange transactions](https://docs.dripcel.com/API/exchange-transactions), and [Tags](https://docs.dripcel.com/API/tags).
