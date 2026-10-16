# Beamer

Manage changelog posts and customer feature requests, inspect engagement and NPS responses, and retrieve personalized feed links.

## Connection

Use an API key from **Settings > API**. Requests use `Beamer-Api-Key` against `https://api.getbeamer.com/v0`. No workspace identifier is required. `get_account` returns the connected product name using Beamer's authentication-check endpoint.

## Tools

| Area | Tools |
| --- | --- |
| Connection and feed | `get_account`, `get_feed_url`, `get_unread_count` |
| Posts | `create_post`, `get_post`, `list_posts`, `update_post`, `delete_post` |
| Engagement | `add_comment`, `list_comments`, `add_reaction`, `list_reactions` |
| Feature requests | `create_feature_request`, `get_feature_request`, `list_feature_requests`, `update_feature_request`, `delete_feature_request`, `vote_feature_request`, `list_feature_request_votes` |
| NPS | `check_nps`, `list_nps_responses` |

## Behavior

- Translation-specific arrays keep their positions. If language codes are supplied, every translation needs its own two-letter code. An omitted CTA keeps an empty slot rather than moving another translation's link.
- Existing numeric inputs remain numbers. Resource IDs, counts, scores, and pagination are validated as whole numbers before requests.
- Post lists, feature requests, comments, reactions, and votes allow up to 10 results per page. NPS responses allow up to 100. Follow `page` to retrieve later results.
- `list_posts` disables analytics view recording and ignores backend request details.
- Feature-request comments expose `featureRequestTitle`; the existing `postTitle` field also contains that title for compatibility. Visibility filters apply only to feature-request comments.
- NPS eligibility follows `shouldShow`. NPS results expose complete string identifiers as `responseId`; the legacy numeric `npsId` appears only for safely representable numeric identifiers.
- Existing `customCategory` translation inputs remain available for compatibility, although the current reference does not document them. The `category` enum includes all six documented built-in categories. Existing `autoOpen` inputs are retained; Beamer marks this option deprecated.

## Scope

Feature availability depends on account permissions, plan, and enabled products. This integration focuses on posts, feedback, and NPS inspection. User analytics management, team administration, NPS email delivery, and one-use NPS survey generation are outside its current tool set. No file-download workflow is exposed.

## Sources

- [Beamer API documentation](https://www.getbeamer.com/api), which embeds the [current API reference](https://getbeamer-api.pages.dev/).
- [Feed integration guide](https://www.getbeamer.com/help/how-to-install-beamer-using-our-api).
