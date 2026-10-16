# Curated API integration

Curated supports publication discovery, newsletter issue reads and draft creation/deletion, collected-link management, email subscriptions, and category discovery. Publishing issues and creating text items require the Curated web interface.

## Authentication and discovery

Use the Account API Key from the Curated account page. The API uses `Authorization: Token token="API_KEY"` over HTTPS at `https://api.curated.co/api/v3`. No OAuth or refresh flow applies. Call `list_publications` to discover publication IDs; setup requires no publication ID.

## Tools

- `list_publications`: account-accessible publication IDs, names, and subdomain keys.
- `list_issues`: published/draft filtering, optional engagement statistics, and pagination (default 10, maximum 250 per page). Database IDs are exposed when returned so draft issues can be retrieved or deleted.
- `get_issue`: fetch a published issue by issue number or database ID; draft issues require the database ID. Includes category codes, text/link content, embedded links, and requested statistics.
- `create_draft_issue`: create a draft using publication defaults.
- `delete_draft_issue`: delete a draft by database ID. Published issues cannot be deleted.
- `list_links` and `get_link`: browse unassigned collected links or retrieve a specific link.
- `create_link`: collect a URL with optional title, description, image URL, and category code.
- `update_link`: change link fields or move a link into a draft issue. An empty `issueId` moves it back to collected items. Published links cannot be updated.
- `delete_link`: permanently remove a collected link.
- `list_subscribers`, `get_subscriber`, and `list_unsubscribers`: read email audience records. Lists support pagination (default 100, maximum 500 per page).
- `subscribe_email`: add an email address, preserving publication welcome-email and double-opt-in behavior. Set `sync` only when synchronizing subscribers who already opted in elsewhere.
- `unsubscribe_email`: unsubscribe an email address.
- `list_categories`: category codes, names, sponsorship flags, and sponsored link limits.

Successful data-returning tools include the complete provider response in `raw`, preserving additional fields and nulls. Typed optional summaries omit nulls; required values are validated. HTTP failures, unsuccessful API operations, invalid inputs, and malformed required response fields produce service errors. List responses without an expected array do not silently become empty results.

No current-user/profile endpoint is documented. The integration declares no triggers or file-generation/download tools. Curated is one product, so separate tool categories are unnecessary.

## Official documentation

- [API setup and authentication](https://support.curated.co/help/getting-started-with-the-api)
- [Publications](https://support.curated.co/help/retrieving-publications-with-the-api)
- [Issues](https://support.curated.co/help/managing-issues-with-the-api)
- [Links](https://support.curated.co/help/managing-links-with-the-api)
- [Email subscribers](https://support.curated.co/help/managing-email-subscribers-with-the-api)
- [Categories](https://support.curated.co/help/retrieving-categories-with-the-api)
