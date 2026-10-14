# <img src="logo.svg" height="20"> Chmeetings

Manage church people, families, groups, organizations, contributions, campaigns, and pledges in ChMeetings. Create and update profiles and public notes, organize family and group membership, record giving, and retrieve event occurrences and attendance.

Connect with an API key from **Settings > Integrations > API Integration**. Use `list_organizations` to discover church and ministry IDs. People searches support name, email, and mobile filters; optional expansions include family members, profile fields, organizations, and groups. Contribution creation accepts a payment method name or ID and a unique client reference for retry deduplication.

For attendance reporting, call `list_events`, then `list_event_occurrences`, then `list_occurrence_attendance`. Event date ranges can span at most 366 days.

Profile updates read the current profile before sending the provider's replacement request and return the refreshed record. Only fields exposed by the current profile can be preserved; avoid concurrent edits to that person during an update. Creation returns the provider record when available, or a creation confirmation when the provider returns no record. The People API cannot change envelope numbers, and contribution creation cannot write check numbers.

[Official API reference](https://api.chmeetings.com/scalar/) · [Developer API guide](https://help.chmeetings.com/hc/en-us/articles/4407466673937-Developer-API-Guide)

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
