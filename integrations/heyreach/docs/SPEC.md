# HeyReach API specification

HeyReach provides LinkedIn outreach campaigns, lead lists, sender accounts, an inbox, and campaign analytics.

## Authentication

Use an API key in the `X-API-KEY` header. Create it under Integrations > API in HeyReach. The API base URL is `https://api.heyreach.io/api/public`.

`GET /auth/CheckApiKey` validates the key through its HTTP success status; it does not document a profile or a boolean response body. The integration's connection profile is a generic HeyReach Account label.

## Supported workflows

| Tool | API request |
| --- | --- |
| `list_campaigns` | `POST /campaign/GetAll` |
| `get_campaign` | `GET /campaign/GetById?campaignId=...` |
| `toggle_campaign_status` | `POST /campaign/Pause` or `/campaign/Resume` with campaignId in the query |
| `add_leads_to_campaign` | `POST /campaign/AddLeadsToCampaign` |
| `stop_lead_in_campaign` | `POST /campaign/StopLeadInCampaign` |
| `get_lead` | `POST /lead/GetLead` |
| `get_leads_from_list` | `POST /list/GetLeadsFromList` |
| `add_leads_to_list` | `POST /list/AddLeadsToListV2` |
| `delete_leads_from_list` | `DELETE /list/DeleteLeadsFromListByProfileUrl` with a JSON body |
| `list_lead_lists` | `POST /list/GetAll` |
| `create_list` | `POST /list/CreateEmptyList` |
| `get_conversations` | `POST /inbox/GetConversationsV2` |
| `send_message` | `POST /inbox/SendMessage` |
| `get_linkedin_accounts` | `POST /li_account/GetAll` |
| `get_overall_stats` | `POST /stats/GetOverallStats` |

Campaign lead imports map each supplied lead to an `accountLeadPairs` item with an optional `linkedInAccountId`. Both resume flags default to true, preserving automatic activation of paused and finished campaigns; callers can disable either behavior. Campaigns must have been launched once before importing leads. Custom field names must match sequence variables and contain only alphanumeric characters or underscores.

Sending a message requires an existing conversation and its LinkedIn sender account ID. The `accountId` input maps to `linkedInAccountId`; the legacy `senderId` input remains accepted but is no longer required. An optional subject is sent as an empty string when omitted.

Analytics use the existing dateFrom/dateTo inputs as the API's startDate/endDate fields. Empty account and campaign ID arrays select all senders and campaigns. Collection outputs retain HeyReach's totalCount metadata.

List removals return `notFoundInList` usernames, because a successful HTTP status may include leads that were absent from the list. Stopping an individual campaign lead uses its `linkedin_id` and LinkedIn profile URL.

HeyReach also documents campaign creation, sequence/schedule configuration, tags, account management, organization administration, and webhooks. Those capabilities are outside this integration's current tool surface; no triggers are registered.

## Official references

- [API documentation and endpoint index](https://docs.heyreach.io/llms.txt)
- [OpenAPI contract](https://docs.heyreach.io/openapi.json)
- [Campaign lead imports](https://docs.heyreach.io/hey-reach-api/campaigns/add-leads-to-campaign)
- [Stop an individual campaign lead](https://docs.heyreach.io/hey-reach-api/campaigns/stop-lead-in-campaign)
- [Remove leads from a list](https://docs.heyreach.io/hey-reach-api/lists/delete-leads-from-list-by-profile-url)
- [Send a message](https://docs.heyreach.io/hey-reach-api/inbox/send-message)
- [Analytics](https://docs.heyreach.io/hey-reach-api/analytics/get-overall-stats)
