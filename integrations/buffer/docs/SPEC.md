# Buffer capabilities

Thirteen tools preserve the twelve original keys and add organization discovery. Current connections use authenticated GraphQL at `https://api.buffer.com`; unmarked stored tokens retain REST at `https://api.bufferapp.com/1`. New OAuth connections use the current authorization server, PKCE, explicit account/post scopes and single-use rotating refresh tokens. Personal API keys are verified by reading the actual account.

| Tool | Current API behavior |
| --- | --- |
| `get_user` | Actual account identity; nullable or unavailable legacy fields omitted. |
| `get_organizations` | Accessible organization IDs, names and actual channel counts. |
| `get_profiles` | One channel, channels in an organization, or across accessible organizations. |
| `get_updates` | Exact post or cursor pages of scheduled, sent or draft posts. Optional personal-key aggregate metrics. |
| `create_update` | One post per channel, including explicit drafts, queueing, scheduling and immediate publication. Not atomic across channels. |
| `edit_update` | Partial edit preserving omitted text, assets and schedule. |
| `delete_update` | Exact confirmed unpublished-post deletion. |
| `share_update` | Publish the existing queued post through editPost/shareNow; no duplicate post is created. |
| `manage_queue` | Experimental move-to-top; full reorder/shuffle retain legacy-only routes. |
| `manage_schedule` | Read day/time/paused schedule entries; writes retain legacy-only routes. |
| `get_interactions` | Legacy-only individual interaction records; no current equivalent. |
| `get_link_shares` | Legacy-only network-wide URL counts; no current equivalent. |
| `get_configuration` | Experimental service/channel-type content capability catalog; legacy response retained for legacy connections. |

GraphQL partial/error envelopes and typed mutation failures never report success. Transport errors retain only validated numeric HTTP status and a static remediation; raw response text and transport ancestry are discarded. Redirects are disabled, requests are bounded by timeouts, path IDs are encoded, and mutations are not automatically retried. File URLs are inputs consumed by Buffer, not downloaded tool outputs.

The private suite uses independent fixed-host identity/readback and preregistered owned-draft cleanup. Queue, publishing and legacy schedule effects require explicit isolated fixture authorization. Published posts/history are retained only under an irreversible-effect gate, without a fabricated deletion or cleanup claim. Live verification is separate from static checks.
