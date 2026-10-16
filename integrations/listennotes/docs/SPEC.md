# Listen Notes

Listen Notes provides podcast and episode search, metadata, discovery, and Listen Later playlist management through its v2 REST API.

## Authentication and environment

Requests use an API key in the `X-ListenAPI-Key` header. Obtain a key from the [API Dashboard](https://www.listennotes.com/api/dashboard/). Production uses `https://listen-api.listennotes.com/api/v2`; the optional `https://listen-api-test.listennotes.com/api/v2` server returns synthetic data. API keys have no OAuth refresh or scope configuration. Team keys act as the API admin for playlist ownership.

## Available tools

- `search_podcasts`: full-text search for episodes, podcasts, or curated lists with date, duration, genre, language, region, and podcast filters. Podcast update frequency and interview/sponsor filters are available where supported by the plan.
- `search_episode_titles`: targeted episode-title matching, optionally restricted by Listen Notes, Apple Podcasts, Spotify, or RSS podcast identifier.
- `get_podcast`, `get_episode`, and `batch_fetch`: retrieve single or multiple resources. Podcast episode pagination uses `nextEpisodePubDate`; batch identifier inputs are comma-separated strings with a maximum of 10 combined items.
- `best_podcasts`, `get_recommendations`, `curated_lists`, `random_episode`, and `get_podcasts_by_domain`: discover podcasts and episodes, including publisher-domain lookup and paginated curated lists.
- `typeahead_search`: autocomplete suggestions, or trending terms when the query is omitted.
- `get_genres_and_regions`: discover genre IDs, supported languages, and region codes.
- `get_playlists`: list playlists or fetch their items. A playlist's `lastTimestampMs` is its item pagination cursor. Name sorting applies only to the playlist index; publication sorting applies only to playlist items.
- `create_playlist`, `update_playlist`, and `delete_playlist`: manage playlist metadata and lifecycle. Deletion permanently removes that playlist's saved references and notes; confirm it with the user before calling the deletion tool.
- `add_playlist_item`, `update_playlist_item`, and `remove_playlist_item`: save a podcast or episode, edit notes, or remove an item. Adding an existing item reuses it; adding a previously deleted item restores it. Omitted notes preserve notes; empty notes clear them. Item IDs are numeric and distinct from episode and podcast IDs.
- `submit_podcast` and `delete_podcast`: submit podcast RSS feeds or request directory removal.

## Limits and returned data

Search offsets are plan-limited: below 30 for FREE, 300 for PRO, and 10000 for ENTERPRISE. Search page sizes range from 1 to 10. Transcript, RSS, email, batch, and some search capabilities depend on the plan. Listen Score and global rank may be unavailable; the corresponding mapped fields are omitted when the provider returns null. Original provider data remains available in each tool's response.

Playlist mutations require ownership by the API admin account; contributor membership does not grant write access. Changing playlist visibility to private rotates the RSS secret. Changing its default episode/podcast view preserves existing items. Playlist names must be nonblank, at most 4096 characters, and cannot be `rss`; notes are limited to 1024 characters.

Audio and image URLs are metadata for playback or display. These tools do not download audio, produce export files, or create transcripts.

## Official reference

The [official API reference](https://www.listennotes.com/api/docs/) and its linked [OpenAPI document](https://listen-api.listennotes.com/api/v2/openapi.json) describe all supported request parameters and response fields. A current-account identity endpoint and general new-episode webhook registration API are absent from this contract. Paid related-search, spellcheck, and RSS-refresh endpoints and audience analytics are outside the current tool set.
