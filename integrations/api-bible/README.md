# <img src="logo.svg" height="20"> API.Bible

Browse licensed Bible editions, books, chapters, verses and thematic sections.
Retrieve passages and keyword or reference search results. Scripture supports
HTML, text and JSON formats; JSON content is serialized into the existing
`content` string field without dropping its content blocks.

Use `list_bibles` and `list_audio_bibles` to discover editions available to your
API key. Audio availability requires provider licensing. Audio chapters include
a downloadable MP3, the original signed resource URL, timing information when
available, and the provider's numeric expiry timestamp. Download links renew on
each download because the provider does not document the timestamp units.

Content tools preserve copyright and original response metadata, including
legacy `fumsId` and current `fumsToken` values when present. Applications remain
responsible for [scripture engagement reporting](https://docs.api.bible/resources/fair-use/).
The integration does not submit tracking events automatically.

Authenticate with your API key from the [API.Bible dashboard](https://api.bible/).
See the [official API documentation](https://docs.api.bible/) for licensing,
content limits and usage requirements.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
