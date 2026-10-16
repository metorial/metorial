# Happy Scribe

Transcribe, subtitle, and translate audio and video files using automatic or human professional services. Discover your organizations, create and confirm orders, track processing and failures, rename or move transcriptions, control public link sharing, and read meeting summaries. Export documents, subtitles, spreadsheets, editing-project files and source media.

Call `list_organizations` to discover organization IDs. Existing saved organization settings remain supported. Create exports with `create_export` and check their state with `get_export`; the older `export_transcription` tool is deprecated. `download_transcription_media` and `download_export` fetch and validate files served by the documented `media.happyscribe.com` host. Supported download formats are MP3, MP4, PDF, UTF-8 TXT, SRT, Facebook SRT, WebVTT and transcript JSON. Downloads on other hosts or in other formats fail explicitly and must be downloaded in Happy Scribe. Files above 100 MiB exceed the download limit. Expired exports are never recreated automatically.

API keys come from the Happy Scribe Account page. See the official [authentication documentation](https://dev.happyscribe.com/sections/general/#authentication) and [Product API reference](https://dev.happyscribe.com/sections/product/).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
