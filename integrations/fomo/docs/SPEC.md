# Fomo Integration Specification

Fomo displays website notifications for customer activity such as purchases, signups, and reviews.

## Authentication

Connect using the API token for a selected website from **Settings > Site**. Requests use `Authorization: Token <token>`. API access normally requires a paid Fomo plan; Fomo can grant test access on request. There is no OAuth flow or additional setup configuration.

## Tools

| Tool | Operation |
| --- | --- |
| `create_event` | Create an event with a template ID or tag and optional customer, location, URL, image, timestamp, and custom fields. |
| `get_event` | Retrieve an event by ID. |
| `list_events` | Retrieve events with page, page size, and available pagination metadata. |
| `search_event` | Retrieve the latest event matching an email address or external ID. |
| `update_event` | Update selected fields on an existing event. |
| `delete_event` | Delete an event from the notification feed. |
| `create_template` | Create a notification template. Fomo recommends the Templates screen for template management. |
| `get_statistics` | Retrieve application performance for a date range. |
| `update_application` | Update display timing, position, theme, UTM tracking, age limits, timestamp thresholds, mobile visibility, and looping. |
| `get_open_metrics` | Retrieve public Fomo marketing metrics, independent of the connected website's data. |

The authenticated event base URL is `https://api.fomo.com/api/v1/applications/me`. Application updates use `PATCH /:ID`; performance statistics use `GET /dashboard` with `date_range[from]` and `date_range[to]`. Public marketing metrics use `https://fomo.com/api/v1/open`.

Template IDs and tags are available in the Fomo Templates screen. API input ID fields retain their existing numeric or string types; invalid numeric resource IDs and pagination values produce a clear error. Event creation requires a template ID or a nonempty template tag.

For `update_application`, `displayPeriod` and `timeAgoPeriod` use 1 for seconds, 2 for minutes, 3 for hours, and 4 for days. `displayThreshold` defines the notification age limit in `displayPeriod` units. `timeAgoThreshold` defines the timestamp threshold in `timeAgoPeriod` units. All six added controls are optional.

## Documentation and limitations

- [Token authentication](https://docs.usefomo.com/reference/fomo-api-auth-token)
- [Event creation](https://docs.usefomo.com/reference/create)
- [Event retrieval](https://docs.usefomo.com/reference/get)
- [Event search](https://docs.fomo.com/reference/search-for-an-event)
- [Event updates](https://docs.fomo.com/reference/update-event)
- [Application settings](https://docs.usefomo.com/reference/update-application)
- [Application statistics](https://docs.fomo.com/reference/application-get-statistics)
- [Public marketing metrics](https://docs.usefomo.com/reference/fomo-open)
- [Event/template model](https://docs.fomo.com/reference/how-it-works)
- [Official Node SDK](https://github.com/usefomo/fomo-nodejs-sdk)

The public reference does not expose readable response examples for every operation, and detailed template endpoint documentation was unavailable during the refresh. Existing template and response mappings remain compatible; no speculative template-list or identity endpoint is added. Current documentation describes `display_for` and `display_interval` in a way that conflicts with the integration's existing help text, so their established public meaning is preserved pending provider clarification. No file download/export operation or outbound event subscription is implemented.
