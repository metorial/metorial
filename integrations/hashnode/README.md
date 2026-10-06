# <img src="logo.svg" height="20"> Hashnode

Read user profiles, owned-publication discovery, publications, posts, drafts, series, comments and static pages. Publish and update posts, or create, update, publish and soft-delete drafts through Hashnode’s current GraphQL API.

Connect with a personal access token. Publication operations require the relevant Pro entitlement and role. `get_user` without a username reads the actual authenticated user. `list_publications` lists publications owned by that user; it does not enumerate every team membership. Select an exact `publicationId` or `publicationHost` per tool, or preserve an existing default hostname. Identity and discovery do not require a configured publication.

The thirteen legacy tool keys and their fields remain. Series writes, comment/reply writes and newsletter subscription are absent from the current official schema and refuse locally with dashboard guidance. Omit the unsupported legacy newsletter flag and tag ID on writes; use tag slugs. New draft update/delete actions stay within `manage_draft`.

Pages use opaque native cursors: at most 100 items, or 50 drafts. Series reads include at most 20 posts and comment reads at most 20 replies per comment, with continuation metadata. Requests have a conservative 100,000-byte cap and at most 15 tags. `publishedAt` backdates immediately published posts; it does not schedule them. Empty terminal pages remain valid.

Post and draft deletion are native soft deletion. ID reads, caches, feeds, delivery and history can retain effects; deletion is not erasure. No upload, export, generated-file or scheduling capability is provided. Image and profile URLs are metadata.

See [API contract](docs/SPEC.md) for official sources and retained-effect limits.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
