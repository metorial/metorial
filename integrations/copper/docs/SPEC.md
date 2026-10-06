# Copper API coverage

Copper Developer API v1 uses `https://api.copper.com/developer_api/v1` and JSON request/response bodies. The current official guides and Postman collection document the same v1 endpoints; no alternate API version is invented.

## Authentication

API keys require `X-PW-AccessToken`, `X-PW-UserEmail` for the key owner and `X-PW-Application: developer_api`. OAuth uses `Authorization: Bearer <token>` and the sole documented `developer/v1/all` scope. The authorization endpoint is `https://app.copper.com/oauth/authorize`; token exchange uses form-urlencoded `POST https://app.copper.com/oauth/token`. Copper explicitly documents non-expiring access tokens without a refresh requirement. The integration therefore does not invent token refresh.

Auth verification independently fetches `/account` and `/users/me`, validates actual numeric IDs and verifies the key-owner email. Existing account-based auth profile IDs are preserved. The read-only `get_profile` tool exposes both account and API-user IDs; no resource ID is required in configuration.

## Tools

| Capability | Tools |
| --- | --- |
| People | create/get/update/delete person; search_people; get_person also supports email lookup |
| Companies | create/get/update/delete company; search_companies |
| Leads | create/get/update/delete lead; search_leads; convert_lead |
| Opportunities | create/get/update/delete opportunity; search_opportunities |
| Projects | create/get/update/delete project; search_projects |
| Tasks | create/get/update/delete task; search_tasks |
| Activities | log_activity, search_activities, list_activity_types |
| Metadata | list_pipelines, list_custom_field_definitions, list_contact_types, list_customer_sources, list_loss_reasons, list_users, list_lead_statuses |
| Identity | get_profile |
| Relationships | get_related_items, create_related_item, delete_related_item |

The 43 established tool keys and field types remain available; identity and lead-status discovery bring the total to 45. Trigger definitions and obsolete webhook client operations are removed without replacements. Bulk, upsert, custom-definition mutation, file upload and administrative user mutation APIs are outside this focused surface.

## Contracts and effects

All inputs serialize to object schemas. Runtime checks reject unsafe IDs, invalid page windows, half-specified relationships, system activity creation and conflicting conversion company selectors. Numeric resource IDs retain their existing types; unsafe integers are rejected before serialization. User Note activity type ID 0 and documented unassigned search sentinel -2 remain valid. Opportunity status search IDs 0–3 mean Open, Won, Lost and Abandoned.

Phone search uses the documented value object. Activity types are returned from user/system groups with category preserved. Search counts refer only to the returned page, never the `X-PW-TOTAL` upper bound. Search continuation stops at the 100,000-result window. User discovery follows all pages and fails if completeness cannot be established. Provider failures use safe messages and numeric HTTP status; token/credential fields are omitted and configured tokens are redacted from returned data. Writes are never retried automatically.

Deletion must acknowledge the requested ID and `is_deleted: true`. Relationship mutations must acknowledge the exact resource and operation. Activity deletion leaves API stubs. Lead conversion removes the lead and may create or associate records; an explicit empty company name prevents company creation. Only changed fields are sent in updates, including explicit zero values and empty strings. Custom Connect field arrays require care because empty values remove connections.

## Official references

- [Authentication](https://developer.copper.com/introduction/authentication.html)
- [OAuth flow](https://developer.copper.com/introduction/oauth/flow.html)
- [API user](https://developer.copper.com/account-and-users/fetch-api-user.html)
- [Pagination](https://developer.copper.com/introduction/pagination.html)
- [Activity types](https://developer.copper.com/activities/list-activity-types.html)
- [Custom field definitions](https://developer.copper.com/custom-fields/general/list-custom-field-definitions.html)
- [Lead conversion](https://developer.copper.com/leads/convert-a-lead.html)
- [Related items](https://developer.copper.com/related-items/overview.html)
