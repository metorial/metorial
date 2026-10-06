# tl;dv

Search recorded meetings, read metadata and speaker-attributed transcripts, and retrieve structured notes and Markdown summaries. Download recordings and submit external media for asynchronous transcription and analysis, with a dry-run option for validation.

API access requires an eligible Pro, Business or Enterprise plan and an API key from Personal Settings → API Keys. A meeting organizer's plan controls API export access; seeing a shared recording in the web app does not guarantee access through the API.

Use `list_meetings` to discover meeting IDs and pagination details. `get_notes` uses the current notes API; `get_highlights` remains available for existing workflows through the deprecated endpoint. `import_meeting` returns a processing job rather than a completed meeting ID. The API does not expose meeting update or deletion.

[Official API documentation](https://doc.tldv.io/index.html) · [API access guide](https://intercom.help/tldv/en/articles/11583137-api)

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
