# <img src="logo.png" height="20"> Eventee

Read the event program, attendees, registrations, groups, partners, and session reviews. Create, update, and delete agenda halls, sessions, breaks, speakers, and labels. Invite attendees with profile information, group assignments, and tickets; create registrations; manage attendee check-in; remove attendees and registrations.

Generate an event-specific Public API token in Eventee's event settings. Every operation targets the event associated with that token. API access requires a supported Eventee plan.

Use `get_event_content` to discover agenda IDs and `list_groups` to discover attendee groups. Session updates replace several fields: read the current agenda first and supply speakers, labels, session type, capacity, and engagement flags to retain them. Hall updates remove their stream when it is omitted.

Invitation and registration requests do not confirm how many people were successfully processed. Entries beyond the first 25 run in the background, and Eventee can skip invalid entries. Verify the final list using `list_participants` or `list_registrations`. Compatibility output fields remain available; `raw` contains original provider fields, including names, roles, status, tickets, and program details. Event metadata or profile fields absent from the provider response are empty strings, and `invitedCountConfirmed` indicates whether a count was actually returned.

API reference: [Eventee Public API](https://docs.eventee.com/).


## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
