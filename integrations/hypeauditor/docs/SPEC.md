# HypeAuditor Integration Specification

## Authentication

Use your HypeAuditor Client ID in `X-Auth-Id` and your API token in
`X-Auth-Token`. No OAuth refresh is required. The API version defaults to `2`;
the existing `1` option remains available for compatibility, although the
provider no longer supports or maintains version 1 report responses.

[Authentication and versioning](https://hypeauditor.readme.io/reference/basic)

## Available tools

| Tool | Behavior |
| --- | --- |
| `search_influencers` | Suggest accounts by name or username across supported social networks. |
| `get_influencer_report` | Request or retrieve analytics reports, preserving asynchronous status and retry delays. |
| `discover_influencers` | Search with account, audience, metric, and content filters. |
| `get_account_media` | Retrieve Instagram, YouTube, or TikTok posts; YouTube supports pagination. TikTok requires a channel ID from a report. |
| `get_metrics_history` | Retrieve Instagram, TikTok, Twitter/X, or Twitch historical metrics. |
| `get_brand_mentions` | Retrieve YouTube or TikTok brand mention data. |
| `get_report_connections` | Retrieve linked social accounts for an influencer. |
| `export_report_pdf` | Request a PDF and provide the existing generated PDF for download when ready. The provider URL remains in the response and expires after 28 days. |
| `manage_lists` | List existing lists, retrieve list reports, add reports, or remove reports from custom lists. |
| `competitor_analysis` | Create an asynchronous Instagram competitor report, retrieve it, or paginate its posts. |
| `get_my_network` | Retrieve creator profiles, optionally filter by creator IDs or social accounts, and paginate with a numeric cursor or an opaque `cursorToken`. |
| `get_account_activity` | List unlocked reports with date filtering and pagination. |
| `get_taxonomy` | Retrieve category, thematic, label, and interest IDs used by discovery and reports. |
| `get_keyword_posts` | Retrieve posts identified by `discover_influencers` with `searchContent`. |

## Workflow notes

- Reports and PDFs can return a retry delay while generating. Do not report them
  as ready before data or a PDF URL is returned.
- Discovery returns 20 results per page, with a maximum of 500 pages. Niche
  search cannot be combined with keyword, content, or description search.
- Instagram and TikTok media maps are returned as arrays of complete media
  objects. Existing IDs and nested metrics are retained.
- The default Recent Searches list has ID `0`; the provider does not permit
  removing reports from it.
- My Network's terminal `null` cursor is omitted. String cursors are exposed as
  `nextCursorToken`, preserving the original numeric cursor fields.
- PDF downloads capture the existing file rather than requesting background
  regeneration when a provider URL expires. The provider does not document a
  separate operation for renewing an existing PDF URL without regeneration.
- No suitable current-user identity endpoint is documented in the reviewed API.

## Official references

- [Report APIs](https://hypeauditor.readme.io/reference/report_instagram)
- [Discovery](https://hypeauditor.readme.io/reference/general_discovery)
- [Taxonomy](https://hypeauditor.readme.io/reference/taxonomy_v1)
- [Keyword posts](https://hypeauditor.readme.io/reference/search_by_keywords)
- [PDF export](https://hypeauditor.readme.io/reference/pdf_export)
- [My Network](https://hypeauditor.readme.io/reference/creator-profile-info)
- [Competitor analysis](https://hypeauditor.readme.io/reference/market_analysis_api)
