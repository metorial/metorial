# Delighted legacy API contracts

Delighted is discontinued. The [official sunset FAQ](https://help.delighted.com/article/840-delighted-sunset-faq), updated June 29, 2026, states that the product ended June 30, 2026 and customer access terminated July 1, 2026, with no extensions. The [current product page](https://www.qualtrics.com/delighted/) confirms it is no longer available. Historical API documentation is not evidence of a working service.

This package preserves all 12 existing action keys, names, input/output fields, enum values and original effect tags, with an added deprecated tag and unavailable guidance. Each handler, token setup and profile lookup returns an actionable unavailable error before reading credentials or making a request. The retained client constructor rejects access without creating a transport. Do not retry or reconnect; select another supported provider. No automatic migration, Qualtrics routing, data recovery, identity discovery, exports, triggers or replacement tools are exposed.

## Historical coverage

The following table records the former contract only. None of these operations can run through this package.

| Retained tool | Former documented workflow |
| --- | --- |
| `send_survey` | Create/update a person and optionally schedule email/SMS; `send=false` suppressed scheduling |
| `list_survey_responses` | Response pages, scores/comments, additional answers, date/person/trend filters |
| `add_survey_response` | Import a person-linked score/comment |
| `get_metrics` | Core NPS response breakdown |
| `list_people` | People, unsubscribed people, or bounced people |
| `delete_person` | Person deletion request |
| `unsubscribe_person` | Email unsubscribe without deleting previous responses |
| `cancel_pending_surveys` | Cancel pending survey requests |
| `get_autopilot_config` | Email/SMS recurring survey settings |
| `add_to_autopilot` | Enroll/update a person; membership properties replaced previous properties |
| `list_autopilot_members` | Email/SMS memberships and next scheduled request |
| `remove_from_autopilot` | Remove recurring membership |

The former API used project-specific Basic credentials (API key as username, blank password) over HTTPS at `https://api.delighted.com/v1/`. No OAuth, token refresh or genuine account/self endpoint was documented in the reviewed API index. Config remains an empty object, and the legacy auth method key/token fields remain unchanged for stored contract compatibility. New setup is unavailable.

People and Autopilot memberships formerly used opaque `Link` header cursors; survey responses used numbered pages. The old client discarded people/membership continuation, used truthiness for zero/empty values, mapped unrestricted native data, and emitted unsupported unconditional deletion/scheduling success claims. Those dormant request/mapping paths were removed rather than promoted as repaired live functionality after the shutdown. Legacy schema looseness and output shapes remain solely for saved contract compatibility. There were no file-download/export tools, and none were added.

## Official references

- [Historical API/auth index](https://app.delighted.com/docs/api)
- [Sending to people](https://app.delighted.com/docs/api/sending-to-people)
- [Listing responses](https://app.delighted.com/docs/api/listing-survey-responses) and [adding responses](https://app.delighted.com/docs/api/adding-survey-responses)
- [Metrics](https://app.delighted.com/docs/api/getting-metrics)
- [People and cursor pagination](https://app.delighted.com/docs/api/listing-people)
- [Unsubscribe semantics](https://app.delighted.com/docs/api/unsubscribing-people)
- [Autopilot configuration](https://app.delighted.com/docs/api/getting-autopilot-configuration), [adding/updating members](https://app.delighted.com/docs/api/adding-people-to-autopilot), and [membership cursor pagination](https://app.delighted.com/docs/api/listing-people-in-autopilot)

The sunset notices determine current availability. Some direct historical-document fetches returned 502 during this audit, while official search-index copies remained readable. No API endpoint was probed and no provider credentials or resources were used.
