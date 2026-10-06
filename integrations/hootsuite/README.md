# Hootsuite

Schedule and inspect social posts, discover connected accounts and organizations, manage team membership, and prepare media uploads using Hootsuite's REST API.

## Connection and discovery

Connect with OAuth 2.0. Offline Access permits token refresh; permissions and product access still depend on the connected account and application. Get User Info returns the authenticated member and authorized organization IDs. The connection has no required organization setting. Team member and social-profile operations accept an organization ID per call; when omitted, discovery must find one authorized organization containing the team.

The REST API at `platform.hootsuite.com` is separate from Hootsuite Analytics, Inbox and SCIM APIs. This integration does not expose those additional products.

## Tools

- **Get User Info** returns current member identity and authorized organizations.
- **List Social Profiles** lists a page of connected accounts or retrieves one profile. Continue with the returned cursor; profile ownership may be a member or organization, and some networks omit usernames and avatar URLs.
- **List Messages** gets one message or a page within a UTC range of at most four weeks. Keep filters unchanged while following cursors. `SEND_FAILED` remains accepted and is sent as the current `SEND_FAILED_PERMANENTLY` state.
- **Schedule Message** creates posts for selected profiles. Hootsuite can accept some profiles and reject others in the same request: inspect accepted IDs and reported failures before retrying. Notification addresses, webhooks and public publishing have external effects.
- **Manage Message** approves, rejects or deletes a message. Approval/rejection requires the current sequence number; rejection also requires a nonblank reason. The provider's omitted reviewer type defaults to EXTERNAL. Deleting a schedule does not promise deletion of a post already published on a social network.
- **Manage Organization Members** lists members, reads a member and permissions, creates or invites a member, or removes membership. Invitations can send email and consume seats. Removing membership does not delete the member's Hootsuite account. Permission-read failures are reported rather than represented as empty permissions.
- **Manage Teams** lists or creates teams and manages their members and connected accounts. The legacy remove-member route remains callable, but current public REST documentation does not establish its availability or a replacement. There is no documented team-delete REST endpoint; plan authorized administrative cleanup before creating a team.
- **Upload Media** creates a temporary signed PUT authorization or reads processing status. Upload exactly the declared byte count and Content-Type without sending Hootsuite credentials to the storage host. Only the first valid upload is used. When status is READY, optional `download: true` supplies a downloadable copy that can be renewed from media status. Normal status calls do not expose the signed download URL. Hootsuite documents removal 90 days after media is used in a message and no media-delete REST API; unused media has no promised immediate cleanup. Current responses do not document MIME or thumbnail fields, so those legacy optional fields are not fabricated. A provider-reported unsigned HTTPS thumbnail permalink remains available; signed or unsafe preview URLs are omitted.
- **Shorten Link** preserves the legacy Ow.ly API call. Current public REST documentation does not establish API availability; the dashboard shortener remains supported. A created short link can retain history and has no documented deletion endpoint.

The legacy team removal and Ow.ly routes are retained with availability caveats. Absence from the current REST specification is not evidence that Hootsuite or those features have been retired.

## API reference

[Current REST Swagger](https://apidocs.hootsuite.com/docs/api/swagger.yaml), [Ow.ly](https://www.hootsuite.com/pages/owly), and [link-shortening help](https://hootsuite.my.site.com/hootsuite/s/article/shorten-track-links).

## License

This integration is licensed under [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
