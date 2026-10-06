# Mixmax API coverage

The integration uses the documented REST API at `https://api.mixmax.com/v1` with the `X-API-Token` header. Token identity comes from `GET /users/me`; its required documented identity field is `_id`. No OAuth or token-refresh flow is documented for this authentication method. Managed API keys and account features can have narrower access than personal keys.

The current [getting-started guide](https://developer.mixmax.com/reference/getting-started-with-the-api) says the API is available to all users. Individual features still require suitable permissions, plans, or connected services. This is not a claim that every endpoint works on every account.

## Tools

All 40 existing action keys and schema field types are retained. Two focused read tools bring the total to 42:

- `list_tasks`: `GET /tasks`, task-query filtering, cursor pagination, 1–500 records, optional timezone. Managed API keys require `tasks:read`.
- `search_sequence_recipients`: `GET /sequences/search`, recipient email query or email array, optional sequence ID, offset and limit, total and recipient identifiers/state.

The existing tools cover identity/preferences, sequence listing and recipient enrollment/cancellation/readback; direct sending and message drafts/readback; template listing/read/update/Trash/send; deprecated contact CRUD/search; meeting types and invite listing; rules; unsubscribe lists; email activity/reports/polls; teams/memberships; connected Salesforce search/create/update.

## API mappings and limits

- Most collections return `results`, `next`, and `hasNext`. Limits and offsets are validated as safe integers. Sequence recipients use an array, offset pagination, at most 50 records, and the first 10,000 records. Task pages allow up to 500; report/live-feed pages up to 10,000.
- Sequence listing filters sequence names with `name`. Recipient search is a separate endpoint and returns an object containing `total` and `results`.
- Recipient enrollment wraps records in `recipients`, supplies the documented matching email personalization variable, and checks every returned recipient outcome. Non-success or incomplete results raise an error containing the known sequence ID and reported outcomes; partial writes must be inspected before retrying. `scheduledAt: false` retains drafts. Omission activates immediately and can send email. Activated-recipient reads exclude drafts, so their absence cannot prove draft state.
- Cancellation of one recipient sends an `emails` array. Empty bulk cancellation is rejected because it would cancel all active sequences. Unsupported `sequenceIds` and ambiguous mixed modes fail locally.
- Direct `/send` does not provide tracking. Tracking-enabled direct sends fail locally and are never silently rerouted. Drafts can be tracked and sent explicitly. There is no documented draft DELETE endpoint or email recall capability.
- Template `title` and `source` map to existing `subject` and `body` fields. Deletion moves the template to Trash, retained for 28 days.
- Contacts are [deprecated but still functional](https://developer.mixmax.com/reference/contacts). Creation can merge existing email addresses and returns no body; the integration confirms the unique ID with an exact-email lookup. Updates use the documented `contact` wrapper. Contact-group updates are not documented and fail locally.
- Rules map `enabled` to inverse `isPaused` and serialize JSON Sift filters. Actions use a separate provider API; legacy inline `actions` fields fail locally rather than reporting false success.
- Team membership reads use `memberId`. Invitations wrap `members`, require an email, send invitation mail, and can affect billing. Adding by user ID is unsupported. Team/rule `modifiedAt` maps to the existing update date field.
- Meeting invitations use `creationDate`. Meeting-type duration and buffer are validated, preserving zero-minute buffer values. The provider does not allow deleting the last meeting type.
- Numeric millisecond message/poll dates convert to ISO strings to preserve existing output types. Live-feed numeric timestamps remain numbers and numeric activity flags become booleans. `livePoll` means recipients can view results.
- Salesforce updates use `PUT` with a matching `Id`. A successful HTTP status is insufficient: the Salesforce result must confirm `success` without errors. The basic search page does not publish its query parameter in the current definition; the existing `q` contract is retained and requires live verification.

## Errors and privacy

Requests use a fixed API origin, bounded timeouts, and no redirects. User validation and service failures use structured service errors. Transport error parents and causes retain only a safe status surrogate, never the raw request or response. Returned arbitrary preferences, report data and Salesforce records use credential redaction and omit credential metadata while preserving ordinary user fields and false/zero values.

No tool downloads or generates a file, and no legacy event trigger remains registered.

## Official references

[Authentication and paging](https://developer.mixmax.com/reference/getting-started-with-the-api), [identity](https://developer.mixmax.com/reference/user), [tasks](https://developer.mixmax.com/reference/listtasks), [sequence names](https://developer.mixmax.com/reference/sequences-1), [recipient search](https://developer.mixmax.com/reference/sequencessearch), [enrollment/drafts](https://developer.mixmax.com/reference/sequencessequenceidrecipients), [activated recipients](https://developer.mixmax.com/reference/sequencesidrecipients), [direct sending](https://developer.mixmax.com/reference/send-post), [template update](https://developer.mixmax.com/reference/snippets-id-patch), [template Trash](https://developer.mixmax.com/reference/snippets-id-delete), [contact update](https://developer.mixmax.com/reference/contactsid-1), [rules](https://developer.mixmax.com/reference/rules-2), [team invitations](https://developer.mixmax.com/reference/teams-members-post), [meeting types](https://developer.mixmax.com/reference/meetingtypesid-1), [Salesforce updates](https://developer.mixmax.com/reference/salesforceopportunityid-1).
