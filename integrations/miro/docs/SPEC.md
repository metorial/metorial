# Miro integration

The integration supports the Miro REST API board collaboration workflows available with `boards:read` and `boards:write`.

## Authentication

OAuth authorization uses `https://miro.com/oauth/authorize`. Token exchange and refresh use `POST https://api.miro.com/v1/oauth/token`; these documented authentication endpoints remain current. Expiring connections refresh their access tokens and preserve the previous refresh token when the response omits a replacement. Non-expiring connections do not require a refresh token. User and authorized-team IDs returned during authorization are persisted for discovery.

Get Current User reads `GET /v1/oauth-token` and exposes the connected user and team without returning tokens. Use the team ID with board creation, copying, or listing. No organization, audit-log, or project administration scope is requested.

## Board workflows

Create, get, list, update, copy, and delete boards. Copy Board sends `PUT /v2/boards` with the source ID in the `copy_from` query parameter. List Boards supports team and project filters, search, sort, and offset pagination. Its returned offset identifies the next page when more boards exist. Effective query searches stop at the first 10,000 matches; the final request limit is reduced to fit the remaining window, and offsets at or beyond 10,000 return guidance to narrow the query or use team/project filters. Team/project filters ignore the query and retain unrestricted offset pagination.

Create and update sticky notes, cards, text, and shapes. Create images from URLs, embeds, and frames. Read or delete board items. Get Frame Items reads `/v2/boards/{board_id}/items` with `parent_item_id` and cursor pagination to discover children inside a frame.

Create, retrieve, and delete connectors. Create, read, update, and delete tags, and attach or detach tags on cards and sticky notes. Tag membership mutations use the item endpoint with a `tag_id` query parameter. Refresh the board to see tag changes made through the API.

Invite 1 to 20 users by email, list board members with pagination, update member roles, and remove members. Tags and members return next offsets when more results exist.

## Official references

- [OAuth authorization and refresh](https://developers.miro.com/docs/getting-started-with-oauth)
- [Permission scopes](https://developers.miro.com/reference/scopes)
- [Access token context](https://developers.miro.com/reference/get-access-token-context)
- [Get boards](https://developers.miro.com/reference/get-boards-1)
- [Copy board](https://developers.miro.com/reference/copy-board-1)
- [Get items within frame](https://developers.miro.com/reference/get-items-within-frame)
- [Attach tag to item](https://developers.miro.com/reference/attach-tag-to-item)
- [Remove tag from item](https://developers.miro.com/reference/remove-tag-from-item)
- [Update tag](https://developers.miro.com/reference/update-tag)
- [Get tags from board](https://developers.miro.com/reference/get-tags-from-board)
- [Get all board members](https://developers.miro.com/reference/get-board-members-1)
- [Share board](https://developers.miro.com/reference/share-board-1)

## Scope

The tool surface excludes enterprise administration, experimental mind maps and flowcharts, webhooks, and downloadable exports. Provider behavior requires verification against an authorized Miro account.
