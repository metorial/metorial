# Gamma Specification

Gamma creates presentations, documents, social posts, and webpages from text or workspace templates. This integration uses the current `v1.0` public API.

## Authentication

Configure an API key from [Settings > API Keys](https://gamma.app/settings/api-keys). Requests authenticate with `X-API-KEY` at `https://public-api.gamma.app/v1.0`. API keys require Pro, Ultra, Teams, or Business access. Gamma also documents OAuth, but this integration currently exposes API key authentication. No current-user or userinfo endpoint is documented.

## Tools

- `generate_content`: start generation with text handling, title, theme, card count and dimensions, images, sharing, and folder options.
- `generate_from_template`: adapt a workspace template file; template eligibility is validated by Gamma.
- `get_generation_status`: retrieve state, generated file ID, provider permalink, credits, failure details, and a downloadable export when ready.
- `list_themes`: discover theme IDs, with name and standard/custom filtering plus cursor pagination.
- `list_folders`: discover accessible folder IDs with cursor pagination.
- `search_gammas`: search title and body text or filter by creator and updated time, returning accessible file IDs.
- `search_templates`: discover workspace templates and browse official explore templates separately.
- `get_gamma`: retrieve document or template metadata, author, theme, timestamps, and archive state.

## Generation constraints

Text and template prompts accept 1-400,000 characters. Additional instructions and image styles accept up to 5,000 characters; tone and audience accept up to 500. Card counts are 1-75 for documented plans. `folderId` selects one folder; legacy `folderIds` is preserved and accepts at most one entry when `folderId` is absent. Headers and footers require a value for text or a source and custom `src` for image positions, and are unavailable for webpages. Email sharing requires recipients.

Poll about every five seconds until completion or failure. Generation responses retain provider warnings. PDF and PPTX exports download directly; PNG exports are ZIP archives containing one image per card. The existing `exportUrl` field remains for compatibility, but callers should use the downloadable result and treat that signed URL as a secret. Provider export links last approximately one week; no renewal or exact expiry field is documented, so automatic renewal is not claimed.

Search returns up to 25 hits and has no documented cursor. Template search returns separate workspace and explore collections; only eligible workspace IDs can be used for template generation. Pagination cursors from themes and folders can be null on the last page and are normalized to an omitted optional cursor.

## Scope and verification

This refresh does not add multi-page generation, agent edits, standalone images, management writes, exports of existing documents, or analytics. Those are separately documented capabilities beyond the focused generation and discovery workflow. No events or webhooks are configured. Local build verification does not establish live-provider correctness or downloadable-file delivery.

## Official API documentation

- [Generate content](https://developers.gamma.app/generations/create-generation)
- [Generate from template](https://developers.gamma.app/generations/create-from-template)
- [Generation status](https://developers.gamma.app/generations/get-generation-status)
- [Themes](https://developers.gamma.app/workspace/list-themes)
- [Folders](https://developers.gamma.app/workspace/list-folders)
- [Document search](https://developers.gamma.app/management/search-gammas)
- [Template search](https://developers.gamma.app/management/search-templates)
- [Document metadata](https://developers.gamma.app/management/get-gamma)
- [Access and pricing](https://developers.gamma.app/get-started/access-and-pricing)
- [OAuth](https://developers.gamma.app/get-started/authenticate-with-oauth)
- [Generation parameter guide](https://developers.gamma.app/guides/generate-api-parameters-explained)
- [Header and footer guide](https://developers.gamma.app/guides/header-and-footer-formatting)
