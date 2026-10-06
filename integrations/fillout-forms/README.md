# Fillout Forms

Discover forms, read native question definitions and submissions, import up to ten responses, and permanently delete an exact submission. Six existing tools are retained.

Use an API key from Developer settings or Fillout OAuth. Configure the public HTTPS API origin shown in your dashboard: US, EU, Canada, or a documented self-hosted instance. OAuth-resolved origins take precedence. Local addresses, embedded credentials, insecure URLs, and redirects are unsupported. No account identity or token-refresh endpoint is invented; the current OAuth documentation provides an access token and API origin without expiry or refresh metadata.

`list_forms` discovers form IDs; `get_form` discovers question/field IDs and native options. `list_submissions` exposes offset pagination, native totals, filters, and optional preview/edit links. `get_submission` reads an exact ID and can download generated documents selected by native document IDs (20 files, 64 MiB total). Unknown link expiry requires a bounded content download; request the submission again for current links. Explicit password sign-in pages are refused; ordinary generated HTML remains supported. File-upload question values remain native response data; they are not treated as generated documents.

`create_submission` checks current form field IDs before importing and returns native receipts plus requested/received counts. An incomplete, malformed, or failed response may follow retained writes: inspect the form before retrying. Scheduling/payment fields import provider data; no appointment creation, charge, currency-unit conversion, or verified login is promised. Official documentation says API imports do not trigger Fillout email notifications, workflows, or integrations. Deletion acceptance does not promise history, logs, or downstream copies are erased. No automatic write retries are performed.

All legacy trigger/webhook helpers and claims are removed. Private coverage is active but live-unverified; no provider operation was performed during this refresh.

## License

[FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
