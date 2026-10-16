# Spotlightr Integration

Manage video links, project groups, player settings, embedding domains, and analytics with Spotlightr's REST API. Global account search and course/gallery access expiration are also available.

## Authentication

Generate an API key in Settings > Integrations & APIs. The API receives it as `vooKey` in the query string for GET requests or form body for POST requests. The integration stores the key with the connection. No extra configuration is required.

## Capabilities

- List videos by video ID or project group; link an external video; delete videos; replace a video source.
- Create and list project groups; update selected player settings; list and add embedding domains.
- Retrieve video metrics, view sessions, and top videos.
- Retrieve global account search results; expire a course access record or gallery access code.

Video creation supports copying settings from an owned video's decoded ID, HLS encryption, and optional custom storage selection. File uploads and browser player commands are outside this integration's tools.

## References

- [Official REST API reference](https://app.spotlightr.com/docs/api/#rest-request)
- [API overview](https://docs.spotlightr.com/en/articles/1479421-spotlightr-rest-and-js-api)
- [Creating videos through the API](https://docs.spotlightr.com/en/articles/4089739-create-videos-by-uploading-or-linking-from-my-site-or-platform)
