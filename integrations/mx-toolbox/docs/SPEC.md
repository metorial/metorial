# MXToolbox Integration

Run DNS, email authentication, blacklist, and network diagnostics; retrieve monitor status and tags; create or delete monitors; and inspect API quotas.

## Authentication

Use an API key from Settings > API in your MXToolbox account. The client sends the key as the plain `Authorization` value without a Bearer prefix. The canonical API base is `https://api.mxtoolbox.com/api/v1/`. Configuration has no account or resource ID fields.

## Tools

- `run_lookup` supports documented DNS and network commands, including blacklist, SMTP, HTTP, HTTPS, TCP, and TLS reporting. The legacy `aa` value maps to `aaaa`. DKIM requires a selector, either as `selector` or in the `hostname` value `domain:selector`. TCP requires `port`.
- `list_monitors` returns monitor UIDs, status, check summaries and structured details, history URLs, and tags. Tag, command, and target name filters can be combined.
- `get_monitor` retrieves the monitor matching a UID from `list_monitors`, returning null when the API returns no matching monitor.
- `list_monitor_tags` retrieves tag names and UIDs for a monitor; returned names can be used to filter `list_monitors`.
- `create_monitor` and `delete_monitor` retain their existing write requests. Monitor access depends on the subscription plan.
- `get_usage` exposes separate DNS and network request counts and limits. The original `used`, `limit`, `remaining`, and `usagePercentage` fields are retained as combined totals. Quotas are independent and cannot be transferred between lookup types.

The public reference documents lookup, monitor retrieval, tag retrieval, and usage routes. Detailed write payloads are available through account-specific documentation; existing create/delete request shapes are preserved.

## API References

- [Current REST API reference](https://api.mxtoolbox.com/api/api-reference)
- [API methods](https://knowledgebase.mxtoolbox.com/home/api-methods)
- [Authentication and account documentation access](https://knowledgebase.mxtoolbox.com/home/about-api)

Monitor access and network lookups depend on the API plan. The `example.com` domain is available for testing. Quota and rate errors are reported as API failures. No account/profile endpoint is documented in the public reference.
