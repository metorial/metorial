# Stack Exchange integration

Use the Stack Exchange API v2.3 to work with Q&A content across its community sites. The connection's `site` defaults to `stackoverflow`; `list_sites` returns the identifiers and names of other sites.

## Authentication

- API key (`api_key`): the application key from Stack Apps; public read operations only.
- OAuth (`oauth`): authorization-code grant via `https://stackoverflow.com/oauth` and `https://stackoverflow.com/oauth/access_token/json`, with the same application key. Requested scopes are `read_inbox`, `write_access`, and `no_expiry`. The integration does not request the unused `private_info` scope; existing grants remain usable.
- Token responses are validated, and `expires` is persisted as `expiresAt` when present. Stack Exchange documents reauthorization, rather than a refresh-token grant. Expiring or revoked connections must reconnect. The connection profile is currently resolved on Stack Overflow; the identity tool can use the configured site.
- Credentials remain in the API's documented `key` and `access_token` request parameters. The linked 2025 authentication help page documents this form; another official authentication page currently describes a bearer header instead.

## Tools

| Tool | Capability |
| --- | --- |
| `search_questions` | Basic title/tag search and advanced text, status, count, and date filters |
| `get_question` | Question detail with separately paginated answers and comments |
| `get_answers` | Answers by question or batch of answer IDs, with pagination and sorting |
| `get_user` | Profile by ID, `me`, or the first display-name search match; optional top answer tags |
| `get_user_activity` | User questions, answers, or public reputation changes |
| `browse_tags` | Tags, metadata, synonyms, related tags, and FAQs |
| `get_inbox` | Connected user's global inbox, optionally unread only |
| `get_notifications` | Connected user's notifications, optionally unread only |
| `manage_comment` | Add, edit, or delete a comment |
| `post_question` | Create a question |
| `post_answer` | Answer a question |
| `edit_question` | Replace a question title, body, and tags |
| `edit_answer` | Replace an answer body |
| `accept_answer` | Accept an answer or undo acceptance |
| `get_post_revisions` | Post revision history |
| `list_sites` | Discover community identifiers and metadata |

Reads return the requested page and provider pagination state. Page numbers start at 1; page size is an integer from 0 to 100 except that `list_sites` has no provider maximum. Dates are ISO 8601; provider timestamps are Unix seconds. Write operations are subject to provider permissions and content-quality checks. Successful comment deletion has no returned comment object.

Responses with missing required data or provider errors fail with a clear error instead of fabricated empty values. Backoff is respected within the running integration process. The integration returns structured data and provider links; it does not download or generate files. It registers no event triggers.

## Official references

- [API documentation](https://api.stackexchange.com/docs)
- [Current authentication help](https://stackapps.com/help/api-authentication)
- [Authentication and scopes](https://api.stackexchange.com/docs/authentication)
- [Pagination](https://api.stackexchange.com/docs/paging)
- [Custom filters](https://api.stackexchange.com/docs/filters)
- [Write requirements](https://api.stackexchange.com/docs/write)
- [Rate limits](https://api.stackexchange.com/docs/throttle)
