# OneSignal REST API

Send push notifications, emails, and SMS/MMS messages. Manage users, aliases, subscriptions, audience segments, message templates, and apps. Retrieve message delivery analytics and downloadable subscription CSV exports. App management and app discovery require an Organization API Key; messaging and audience tools require an App API Key.

Use the App API Key as `token`. Optionally provide `organizationToken` for app discovery and app management in the same connection. An Organization API Key supplied as `token` continues to work for app tools.

Call `list_apps` with an Organization API Key to discover App IDs, then pass `appId` to messaging and audience tools. If you only have an App API Key, copy its App ID from Settings > Keys & IDs. Existing connections retain the optional legacy default App ID.

Exports can take time to generate; their download URLs may return 404 until ready. They expire after three days. Reopening an expired downloadable export requests current data with the original filters.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
