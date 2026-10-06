# Ghost API compatibility

The implementation targets the documented REST Admin and Content APIs with minimum version header `v5.0`. Current Ghost versions negotiate this minimum; permissions and enabled product features still govern availability.

Official sources: https://docs.ghost.org/admin-api, https://docs.ghost.org/content-api, https://docs.ghost.org/admin-api/posts/creating-a-post, https://docs.ghost.org/admin-api/posts/updating-a-post, https://docs.ghost.org/admin-api/newsletters/sender-email-validation, https://docs.ghost.org/admin-api/webhooks/overview. Native staff `me` binding is corroborated by https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/api/endpoints/utils/serializers/input/users.js.

Supported tools: browse_posts, manage_post, browse_pages, manage_page, browse_tags, manage_tag, browse_members, manage_member, browse_newsletters, manage_newsletter, browse_tiers, manage_offer, browse_users, get_site, manage_webhook, get_current_context, get_resource, export_content.

Admin and staff credentials sign HS256 JWTs using the exact hex secret, key ID, `/admin/` audience, epoch-second issue time and a five-minute expiry. Content keys use the `key` query parameter only on read-only Content API routes. The authenticated site URL owns the instance and optional subdirectory. Legacy stored `adminDomain` is validated only when auth output has no site URL; existing raw JWT credentials must reconnect with the original signing key. No user identity is inferred from an integration key, JWT claims, or public site metadata.

Posts/pages read by exact ID or slug. Writes retain native concurrency and source conversion behavior. Browse returns current page metadata, not an accumulated result. Offers/newsletters retain archive semantics and pending verification metadata; webhook update preserves native api_version. Native errors are mapped to actionable provider failures without retaining transport credentials. A refusal after a network write does not imply rollback: inspect exact native IDs or the unique marker before retrying. Existing safe ServiceErrors propagate unchanged.

Content exports transform one exact native API representation into a local HTML/JSON file, bound to returned resource ID. They do not download remote media, render PDF, create a provider export job, expose a renewal endpoint, or imply a complete site backup.
