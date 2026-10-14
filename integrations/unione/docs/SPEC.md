# UniOne Integration

UniOne provides transactional email sending, reusable templates, sender domain verification, suppression lists, email validation, historical event exports, and isolated projects.

## Authentication

Connect with a user or project API key. Requests use the `X-API-KEY` header. The automatic endpoint is preferred; European and US endpoints can be selected in the datacenter setting. Project management and confirmed-email operations require a main account key. Projects must first be enabled by UniOne support.

## Email and sender workflows

`send_email` accepts up to 500 recipients with personalization, HTML/plaintext/AMP bodies, stored templates, base64 file inputs, tracking, and scheduled delivery. `idempotenceKey` prevents duplicate sends within one minute. ISO 8601 times are converted to the UTC format expected by UniOne. Support approval is needed for some unsubscribe, tracking, and suppression bypass options.

`get_domain_dns_records` registers a missing sender domain and generates its keys, or retrieves the existing keys. Publish the returned verification value unchanged as a root TXT record, and publish `k=rsa; p=<returned raw DKIM key>` at `us._domainkey.<domain>`. Add `include:spf.unione.io` to the existing SPF record; if none exists, UniOne recommends a root TXT value of `v=spf1 include:spf.unione.io ~all`. SPF is setup guidance rather than an API-returned value. Then use `validate_domain` and `list_domains` to check status. Domain listings support filtering and pagination. Only confirmed domains with active DKIM are ready for sending.

`create_confirmed_email`, `list_confirmed_emails`, and `delete_confirmed_email` manage addresses eligible for sandbox-domain sending. Registration requests a confirmation link and does not itself prove the recipient completed confirmation.

## Data and account workflows

Templates, suppression entries, tags, and projects have listing and management tools. `get_system_info` identifies the connected account or project and returns available accounting details. `validate_email` exposes the textual validation result and numerical validity score.

Template creation requires a name and sender email. Template updates retrieve omitted name and sender values from the existing template in one lookup. Project updates retrieve the existing project name when omitted. If required values cannot be resolved, the tool reports which value to supply or which identifier to verify.

`create_event_dump` starts an asynchronous CSV export. Pass its `dumpReference` to `get_event_dump` or `delete_event_dump`. The legacy numeric `dumpId` field remains supported where available. `get_event_dump` provides downloadable files and preserves download URLs; completed files can be downloaded while other files are still processing. UniOne automatically removes export files after eight hours. The legacy `allEvents` parameter is retained, but current documentation does not describe its upstream `all_events` flag; use documented status filters for event selection.

## Official references

- [Web API reference](https://docs.unione.io/en/web-api-ref/)
- [API changelog](https://docs.unione.io/en/api-changelog/)
- [Machine-readable API specification](https://docs.unione.io/openapi/unione-web-api-latest.json)
