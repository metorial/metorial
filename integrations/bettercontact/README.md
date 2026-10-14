# BetterContact

Find verified work email addresses and mobile phone numbers, retrieve enrichment results, check account credits, and look up person or company profiles.

- `enrich_contacts`: submit up to 100 contacts; optional catch-all verification and timeout controls are supported.
- `get_enrichment_results`: retrieve a request; only `completed: true` and `status: "terminated"` indicate final results. Wait a few seconds between polls. Top up credits to resume an `on_hold` request.
- `check_credits`: read the account email and remaining organisation credit balance.
- `enrich_lead_profile`: synchronously look up a person by LinkedIn URL, or first name, last name and company domain. Profile data excludes email and phone; successful matches cost 0.1 credit.
- `enrich_company_profile`: synchronously look up a company by domain or LinkedIn page without consuming credits.

Use an API key from the BetterContact dashboard API section. Enrichment submissions are not idempotent: retain the returned request ID instead of resubmitting a successful request.

[Official API documentation](https://doc.bettercontact.rocks/quickstart)
