# Piloterr integration

This integration covers selected [Piloterr API families](https://docs.piloterr.com/credits), using API key authentication and the current `https://api.piloterr.com/v2` API. Calls extract public website data and can consume credits even though they do not modify the target websites.

## Authentication and account discovery

Create a key in the [Piloterr dashboard](https://app.piloterr.com/), then connect with that API key. Requests send the key in the `x-api-key` header. There is no OAuth flow or required connection configuration.

Call `check_usage` to inspect actual account name and slug, key status, credit balances, subscription and pack information, and rate limits. The [Usage endpoint](https://docs.piloterr.com/usage) is free. The subscription object combines subscription quota and packs; it does not identify a subscription plan name unless the API separately returns one.

## Available capabilities

- Website crawling, JavaScript rendering, and approved-domain WebUnlocker access return HTML. These cost 1, 2, and 3 credits respectively. Technology detection and contact extraction cost 1 credit.
- LinkedIn company, profile, job, post, job search, job suggestions, and job count calls cost 1 credit. Use `linkedin_job_suggestions` with `location=true` to find location IDs, and `linkedin_company` to find company IDs. Job search is page based, returning up to 25 listings per page.
- Google web, news, images, and videos, plus Bing and Brave web search, cost 1 credit per call. Preserve returned pagination to decide whether another page is available. Google Images returns batches of 100. Google web's `num` parameter is deprecated and may not affect result counts.
- Amazon search, product details, and seller offers cost 1 credit each. `amazon_product` with `includeOffers=true` makes a second paid call. Amazon search is page based, up to 60 items per page. Shopify product calls cost 1 credit; Walmart product calls cost 2 credits.
- Company domain enrichment costs 1 credit. Crunchbase entity search, company profiles, and funding rounds cost 2 credits. Funding rounds return at most 15 results per call; refine filters rather than assuming the returned array is exhaustive.
- Email verification and discovery cost 1 credit each. Email discovery needs a full name and a company domain or company name. WHOIS, malicious-domain, and DNSBL checks cost 1 credit each; `check_domain_reputation` with `checkType=both` makes two calls.
- Instagram profile/post, GitHub profile, and Trustpilot company calls cost 1 credit each. GitHub's documentation currently marks its endpoint availability as degraded.

## Screenshots

Use `capture_screenshot` to request a downloadable PNG, JPEG, WebP, or PDF for 2 credits. It supports viewport size, full-page capture, selector capture, wait conditions, and page cleanup options. File metadata distinguishes a completed capture request from a failure to prepare its returned file. Review any delivery warning before requesting another paid capture.

`screenshot_webpage` remains available for existing callers and is deprecated in favor of `capture_screenshot`. Its original input, output, and invocation behavior are preserved. The current [Screenshot documentation](https://docs.piloterr.com/website-screenshot) requires `url` and documents a direct file response; the replacement uses that API without cloud-storage credentials or returned storage URLs.

## Response semantics and scope

Existing typed summaries remain available when the provider returns representable data. Complete original non-file responses are available in `raw`, including nulls, nested objects, and provider fields that do not fit older summary types. Missing optional counts, IDs, and scalar values are omitted; they are not manufactured as zeroes or empty strings.

The integration does not expose the entire provider catalog, arbitrary custom API paths, asynchronous jobs, or every retailer and niche scraping API. It has no registered triggers. Provider acceptance and downloadable delivery require verification in the connected deployment.

Official references: [Introduction](https://docs.piloterr.com/introduction), [Credits](https://docs.piloterr.com/credits), [Error handling](https://docs.piloterr.com/error-handling), [API keys](https://docs.piloterr.com/api-keys), [Complete API reference](https://docs.piloterr.com/llms-full.txt).
