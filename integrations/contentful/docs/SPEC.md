# Contentful tool surface

The integration exposes twenty public tools: `search_entries`, `get_entry`, `create_entry`, `update_entry`, `manage_entry_lifecycle`, `search_assets`, `get_asset`, `create_asset`, `manage_asset_lifecycle`, `list_content_types`, `manage_content_type`, `manage_tags`, `list_locales`, `list_environments`, `sync_content`, `schedule_action`, `manage_release`, `get_current_user`, `list_spaces`, and `download_asset`.

Each environment-scoped operation accepts optional per-call space and environment selection. Saved defaults are optional. Search and offset list tools expose native totals and advancing offsets; release and scheduled-action collections expose native cursor URLs. Read tools bind known Management/Delivery/Preview credentials to their corresponding API. Legacy unknown-mode tokens may explicitly select the documented API. Native fields are returned for all locales, with API-specific system timestamp semantics retained.

Creation and lifecycle operations require Management credentials. Entry fields are replaced completely; current metadata is retained. Version headers prevent blind overwrite. No automatic write retries or rollback are promised. Native asset processing must yield every requested locale URL before publication. A pending receipt or failure preserves exact resource recovery information.

Release.v1 creation translates the existing entity array into native `entities.items`. Publish/unpublish use native asynchronous actions; action status lookup stays within `manage_release/get`. Unsupported legacy release description writes fail locally with remediation. No Release.v2 or wider administrative tools are added.

Download requires an exact asset ID and locale, verifies native space/asset CDN path binding, and delivers only a public processed original. Secure/embargoed assets require a separate delivery configuration. No fabricated expiry or file renewal is exposed. CMA user identity comes only from `/users/me`; Delivery/Preview keys do not imply a user identity.

See the README for credential setup, OAuth callback compatibility, retained effects, and current official sources. Legacy webhook-only client methods were unused and removed; no replacement triggers were introduced.
