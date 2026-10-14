# ChatFAI Specification

ChatFAI provides character discovery and AI-generated character replies.

## Authentication

Generate an API key from the [API Keys page](https://chatfai.com/developers/api_keys),
linked by the [developer page](https://chatfai.com/developers). The integration
sends the key as a Bearer token to `https://api.chatfai.com/v1/`.
Blank keys are rejected before use.

API message credits are purchased separately through ChatFAI billing; the
[official subscription guidance](https://help.chatfai.com/article/50-does-the-api-work-with-my-subscription)
explains that subscription messages cannot be used with the API.

## Tools

| Key | Behavior |
| --- | --- |
| `search_characters` | Search the public character catalog by query and return character IDs and details. |
| `get_character` | Retrieve a public character by the ID returned by search or found in its character-page URL. |
| `send_message` | Submit conversation context for a character reply, with optional name, biography, and response-optimization overrides. |

Character results retain their IDs, names, biography, genre, and optional image
and greeting. Missing biography or genre is represented by an empty string;
missing optional image and greeting values are omitted. Invalid core character
details, malformed search results, and replies without a string `reply` field
produce a clear error rather than a successful incomplete result.

## Reference availability

The [official API reference](https://chatfai.com/developers/docs), linked from
the developer page, was unavailable during the 2026-10-13 refresh. Existing
routes and provider payload fields were retained. No undocumented endpoint,
identity tool, conversation-management capability, or event support is claimed.
