# Bubble integration

The supported surface is ten public tools: `create_record`, `get_record`, `search_records`, `update_record`, `replace_record`, `delete_record`, `bulk_create_records`, `trigger_workflow`, `get_api_spec` and `export_records`. All nine existing keys and fields are preserved. No trigger or replacement event mechanism is registered.

Requests target the app’s native `/api/1.1` Data API and configured Workflow API. New authentication binds the app URL; validated legacy configuration and anonymous mode remain compatible. No user identity, login endpoint, permission scope, token-refresh grant or export job is invented. Admin tokens, externally supplied user tokens and public access follow the app’s actual privacy and exposure settings.

Bulk creation uses native text/plain NDJSON and per-row receipts; partial/ambiguous writes retain recoverable IDs. Record mutation acknowledgements use documented 201/204 statuses. Search exposes native offset/count/remaining plus additive `nextCursor`; bounded local JSON export does not promise snapshot consistency, higher plan limits or unrestricted data access. API schemas remain available through the existing discovery tool when enabled.

See the [README](../README.md) for current official references, setup, compatibility and retained effects. Runtime checks and private controlled lifecycle coverage are reported separately from live provider acceptance.
