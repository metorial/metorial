# Zixflow

Manage CRM collection records, list entries, and activities, and send WhatsApp, SMS, RCS, email, and OTPflow requests. Discover collections, lists, workspace members, CRM attribute definitions, select-option values, WhatsApp resources, and RCS template variables. Retrieve WhatsApp, SMS, and email delivery reports. Responses preserve the complete provider data alongside compatible summaries.

Use `list_collections` or `list_lists` to discover IDs, then `list_attributes` to discover field API names and required values before writes. Record and entry queries accept limit/offset, sort arrays, and a documented `filterObject`; the legacy `filter` array remains supported as an AND expression. Use one filter input at a time.

Use a Zixflow App API key from Settings > Workspace Settings > Developer > API Key. The API key is sent as a Bearer token to `https://api.zixflow.com/api/v1`. A successful send response confirms the provider acknowledged the request; inspect delivery reports or configured callbacks for recipient delivery. This integration uses the Zixflow App API, whose credentials differ from the Zixflow AI API.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
