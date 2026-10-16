# <img src="logo.png" height="20"> Typefully

Create, schedule, and publish social media content across X (Twitter), LinkedIn, Threads, Bluesky, and Mastodon. Manage multi-platform drafts with per-platform tailored content, schedule posts for specific times or queue them into available slots, and publish immediately. Upload and attach media (images, videos, GIFs, PDFs) to posts. Organize content with tags, manage social sets (groups of connected platform accounts), filter drafts by status, inspect publishing queues, set accessible media descriptions, and collaborate through anchored draft discussions.

The integration uses Typefully API v2 with a Bearer API key created in Settings → API. Start with `get_current_user` to inspect the connected user and `list_social_sets` to discover accessible social sets. Social sets and tags support limit/offset pagination.

Use `planAt` to date a draft without committing to publish; use `publishAt` to confirm scheduling. Immediate publishing runs asynchronously: poll `get_draft` until `publishState` is `finished`, then inspect the actual draft status and published URLs. When editing drafts with comments, preserve the comment markers returned by `get_draft`.

Media upload initiation returns a presigned URL. Upload raw bytes with a plain PUT and no extra headers, then check processing status before adding media to a draft. Set alt text before attaching media; after changing alt text on an existing draft, resend its media content with `update_draft` so all platforms receive the new description.

See the [official API reference](https://typefully.com/docs/api) for permissions and provider limits.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
