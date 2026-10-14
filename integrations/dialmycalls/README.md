# DialMyCalls

Send voice and text broadcasts, with optional email notifications. Manage contacts, groups, recordings, caller IDs, and access accounts. Inspect broadcast delivery statuses, incoming texts, keywords, shortcodes, vanity numbers, and do-not-contact entries. Create recordings using text-to-speech, an MP3/WAV URL, or a phone call; ready recordings are available to download.

Use `list_contacts` and `get_contact` to inspect recipients and their group membership, `list_keywords` and `list_shortcodes` to discover text-broadcast sender IDs, and `list_incoming_texts` before deleting a received message with `delete_incoming_text`.

API list requests return up to 100 records per page. Supply `range` in the form `records=1-100`, then request the next range as needed. The `get_account` tool returns account information and available credits. Authentication uses your account's API key.

See the [official API documentation](https://www.dialmycalls.com/api-documentation) for provider requirements.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
