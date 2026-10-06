# Vimeo API coverage

Current reference contracts: Vimeo3.4.9 documentation, requested API version3.4. Provider routes remain `https://api.vimeo.com` and authenticated `/me` aliases.

| Capability | Tools |
| --- | --- |
| Video and account reads | get_video, get_user, list_videos, search_videos |
| Metadata and comments | edit_video, delete_video, list_video_comments, add_video_comment |
| Likes | list_liked_videos, like_video |
| Showcases | list_showcases, get_showcase, create_showcase, edit_showcase, delete_showcase, list_showcase_videos, manage_showcase_video |
| Folders (native projects) | list_folders, get_folder, create_folder, delete_folder, list_folder_videos, manage_folder_video |
| Channels | list_channels, get_channel, create_channel, delete_channel, list_channel_videos, manage_channel_video |
| Categories | list_categories, list_category_videos |
| Downloadable rendition | download_video |

Native HTTP completion statuses and canonical resource identities are validated. Folder deletion explicitly keeps its videos. Tag/domain replacement uses documented relationship endpoints and verifies complete inventories. Writes can be partially committed across calls and are never retried automatically.

Sources: [authentication](https://developer.vimeo.com/api/authentication), [auth response](https://developer.vimeo.com/api/reference/response/auth), [videos](https://developer.vimeo.com/api/reference/videos), [folders](https://developer.vimeo.com/api/reference/folders), [showcases](https://developer.vimeo.com/api/reference/showcases), [channels](https://developer.vimeo.com/api/reference/channels), [download links](https://help.vimeo.com/hc/en-us/articles/12427806914577-About-video-file-download-links-from-the-API).

No live account or media operations were performed during refresh. Current documentation is used directly; Vimeo's archived GitHub OpenAPI is supplemental historical evidence only.
