# WaiverFile API integration

WaiverFile manages signed waivers, waiver form definitions, and events. Signer and participant data remains in the complete provider response, including provider IDs, reference IDs, custom fields, and null values.

## Authentication

Use the API Key and Site ID shown under **Settings → API → API Keys** in the WaiverFile dashboard. Both are authentication credentials. The Site ID is stored with the API key; there is no duplicate tool configuration or separate organization identifier. Existing credential field names remain supported.

## Workflows

- `get_site_details` identifies the connected site and retrieves its configuration.
- `get_waiver` retrieves a complete signed waiver. `search_waivers` searches by terms or reference IDs linked to external bookings.
- `list_waivers_by_date` retrieves tabular waiver data with custom-column and participant consolidation options. Page indexes start at zero; page size is capped at 500.
- `list_complete_waivers` retrieves complete waiver records by signing date. `get_waiver_data_count` provides the count response for planning tabular retrieval.
- `get_waiver_forms` discovers active forms or all forms, including deleted forms.
- `list_events` discovers events by UTC date range, category, or upcoming status. `create_event`, `update_event`, and `delete_event` manage events.
- `manage_event_categories` lists, creates, updates, and deletes categories.
- `manage_event_managers` invites managers or revokes event access.

The API reference leaves most response objects unspecified. Tools preserve provider responses without guessing list envelopes, missing counts, identifiers, or operation status. Successful requests return the response; a response alone may not establish an asynchronous workflow's completion.

## Limits

No PDF download tool or webhook trigger is registered. The documented PDF operation does not specify a binary or download-URL response. Webhook signature and registration identity guarantees require additional evidence before adding triggers.

## Official references

- [API reference](https://api.waiverfile.com/swagger/ui/index)
- [Swagger specification](https://api.waiverfile.com/swagger/docs/v1)
- [Registration and booking integration guide](https://www.waiverfile.com/Resources/Help/Advanced-Options/Workflow/Registration-Integration-How-To.aspx)
- [API credential setup](https://www.waiverfile.com/Resources/Help/Export-and-Integrations/Integrations/Zapier.aspx)
