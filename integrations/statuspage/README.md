# Statuspage

Manage Statuspage pages, components, component groups, incidents, postmortems, subscribers and system metrics with an API key.

Use `list_pages` to discover accessible page IDs. The connection can store an optional default page, and every page-scoped tool accepts a `pageId` override. The API key's permissions determine access. The management API allows approximately one request per second per key; space calls and inspect a write's result before repeating it after an error.

| Tools | Operations |
| --- | --- |
| list_pages, get_page, update_page | Discover pages, inspect settings, and update name/domain/time zone and subscription preferences |
| list_components, manage_component | Paginated discovery and component create/update/delete |
| manage_component_group | Paginated discovery and component-group create/update/delete |
| list_incidents, get_incident, create_incident, update_incident | Paginated discovery/search; realtime, scheduled and historical creation; updates, resolution and deletion |
| list_incident_templates | Paginated inspection of existing incident templates |
| manage_postmortem | Inspect and save drafts; publish or revert a resolved incident's postmortem |
| list_subscribers, manage_subscriber | Paginated contact/state search; inspect, create email/SMS/webhook subscriptions, and unsubscribe |
| manage_metric, submit_metric_data | Discover existing metric providers; metric list/get/create/rename/delete; submit custom data for asynchronous processing |

Incident updates and postmortem publication change the status page and can notify subscribers or Twitter. Subscriber creation can send confirmation messages; trial pages ignore confirmation suppression. Slack, Teams and integration-partner subscriptions use their product setup flows. The current API does not restore unsubscribed subscribers; the legacy `resubscribe` option reports that limitation. Custom CSS content is configured in the management interface, not through `update_page.cssBody`.

Component, group, template and metric pages use `limit` up to 100 and page numbers beginning at 1. Subscribers use page numbers beginning at 0; their size is capped at 100 when searching contact text. Incident search uses the all-incidents filter. Unresolved and scheduled lists do not support keyword search.

The page's `url` setting is the company website linked from its logo. The status page itself is located at its domain or provider subdomain.

See the [official API reference](https://developer.statuspage.io/) for permissions and provider limits.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
