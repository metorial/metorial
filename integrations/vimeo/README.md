# Vimeo

Read and search videos, edit authorized metadata, organize showcases, folders and channels, and manage comments and likes. The 32 public tools preserve the existing 29 tool keys and add exact folder/showcase reads and eligible video downloads.

Use OAuth or an authenticated personal access token. Public-only app tokens cannot identify the current user or read private libraries. `get_user` without `userId` reads the authenticated `/me` profile. OAuth requests public, private, edit, delete, interact, create and video_files scopes. Stored token and legacy expiration fields remain compatible; Vimeo does not currently support a refresh-token grant. An expired token requires reconnection.

Folder operations use Vimeo's native project routes. List results expose actual page, per-page, total and optional navigation values. The legacy alphabetical folder sort maps to native name, and showcase modified_time maps to last_modified. Unsupported legacy folder sorts fail with guidance before dispatch.

Video tag and embed-domain updates replace their existing sets using separate native calls. An empty array clears a set. Metadata and relationship changes are not atomic: inspect the exact resource before retrying a partial failure. Password values cannot be independently verified from a public readback. Channel creation requires explicit privacy even though its retained input schema allows omission.

Downloads require an eligible Vimeo membership plus public, private and video_files scopes. The tool selects a native downloadable rendition and uses its unchanged, dated redirect URL. Renewal verifies the original viewer, owner, video and rendition identity before requesting a fresh link. Adaptive playlists are excluded. Only native HTTPS Vimeo redirect origins are accepted; credentials are never sent to signed storage. Native size is approximate. Media bytes, redirects and entitlement behavior require live verification.

Uploads, live streaming, player administration, captions and webhook triggers are outside this package's tools. Private verification is active but has not been run against a live Vimeo account. Destructive and retained effects require explicit controlled fixtures and prerequisites.
