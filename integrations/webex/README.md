# Cisco Webex

Send and manage messages, spaces, space memberships and teams. Schedule and manage meetings, discover people and the authenticated person or bot, and read meeting recordings. Prepare exact message files and authorized recording files for download. Webex scopes, roles, licenses, retention and file-scanning policies apply.

Connect with a registered OAuth integration or a bot token. OAuth requests only scopes used by the exposed tools and refreshes expiring tokens. Existing stored tokens remain usable within their granted permissions. Bot tokens have messaging membership/mention restrictions and do not imply licensed meeting access. `get_person` without `personId` retrieves the actual authenticated identity.

The 26 existing tool keys are preserved. `download_resource_file` adds exact message-file or recording-file delivery. Message downloads use the authenticated Webex content URL. Recording downloads use the provider's direct video link and native expiration, with renewal bound to the same recording, site, authenticated person and file metadata. A recording download page is not substituted for a file. Downloads may be unavailable when prevented by policy, access or malware scanning; this integration does not bypass scanning.

List tools return one native page and optional `nextPageUrl`. Use the next-page URL alone until it is absent, including after an empty page. Direct-message listing supports a person target and optional parent ID; space-only mention/date/page-size filters are rejected for direct messages.

Meeting creation requires title, start and end at runtime, while historical optional input fields remain available. Meeting updates use the current PATCH endpoint and its documented object body/media type. Updating recurring times can cancel exceptions; notifications and calendar-connector restrictions remain governed by Webex.

Space updates preserve the current required title if omitted. Membership updates preserve returned settings; when the native read omits a setting required by the current PUT schema, supply both settings explicitly. No setting is guessed.

`delete_space` reports request acceptance and a possible native effect: a team space is archived, and a non-moderator can be removed from a space rather than deleting it. Deleting teams retains associated spaces. Message/space deletion does not promise erasure of compliance retention, notifications or history. Writes are never automatically retried.

No event triggers, calling, device administration, transcript management, organization provisioning or webhook registration are exposed.
