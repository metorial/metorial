# ZeroBounce Integration

## Authentication and regions

Use an API key from the ZeroBounce dashboard. Requests send `api_key` in the
query string for GET endpoints or in the JSON body for batch validation. The
`region` setting selects the default, US, or EU API host. API keys are static;
there is no OAuth refresh flow or separate account identity endpoint.

## Supported tools

- `validate_email`: Validate a single address or up to 200 addresses. Arrays are
  processed sequentially in groups of no more than 100, matching the current
  rate limit documentation while retaining the existing input limit. Single
  validation timeouts are 3–60 seconds; batch timeouts are 10–120 seconds.
  Optional Activity Data and Verify+ flags are forwarded to the provider.
  Results include deliverability status, enrichment, domain details, catch-all
  domain status and the first detected activity date when available. Per-email
  batch errors retain the affected address; account-wide failures raise errors.
- `score_email`: Retrieve an email quality score from 0 to 10. The real-time
  scoring response contains `email` and `score`; it does not include validation
  status. The existing `address` and `zerobounceScore` output fields expose this
  response, with an empty `status` for scoring-only results.
- `find_email`: Find a person's business email using a domain or company name
  and optional name fields. Calling it without a name continues to return
  domain patterns for compatibility.
- `search_domain`: Discover the domain, primary email pattern, confidence, and
  alternative patterns for a domain or company name. This dedicated tool does
  not need a person's name. A successful search consumes one subscription query
  or 20 credits; an undetermined result does not consume credits or queries.
- `get_activity_data`: Retrieve recent activity and its first detected date.
- `get_account_info`: Retrieve available credits, optionally including API usage
  and sub-status counts for a valid date range. Provide both dates or omit both.

The provider may consume credits for validation, scoring, activity, and search.
ZeroBounce returns some failures as HTTP 200 JSON bodies; these are reported as
errors, including invalid API keys, exhausted credits, and invalid dates.

## Official sources

- [Single validation](https://www.zerobounce.net/docs/email-validation-api-quickstart/v2-validate-emails)
- [Batch validation](https://www.zerobounce.net/docs/email-validation-api-quickstart/v2-batch-validate-emails)
- [Rate limits](https://www.zerobounce.net/docs/api-dashboard/api-rate-limits)
- [Single scoring](https://www.zerobounce.net/docs/ai-scoring-api/single-email-scoring)
- [Email finder](https://www.zerobounce.net/docs/email-finder-api)
- [Domain search](https://www.zerobounce.net/docs/domain-search-api)
- [Activity data](https://www.zerobounce.net/docs/activity-data-api)
- [Credit balance](https://www.zerobounce.net/docs/email-validation-api-quickstart/v2-credit-balance)
- [API usage](https://www.zerobounce.net/docs/email-validation-api-quickstart/v2-get-api-usage)

Bulk files, list evaluation, WHOIS, allowlists, and blocklists are outside this
integration's current tool surface.
