# MemberVault API specification

MemberVault hosts online courses, memberships, and digital products. This integration covers the four endpoints published in the [official API Endpoints documentation](https://intercom.help/membervault/en/articles/6869595-api-endpoints-advanced), checked on October 15, 2026.

## Connection

The account subdomain identifies the MemberVault site. API requests use `https://{subdomain}.mvsite.app/api/{endpoint}` and authenticate with the `apikey` query parameter. Find the key under **Integrations → Other → Webhooks API** in the MemberVault admin. The API uses GET requests, including for mutations. No OAuth flow, refresh tokens, or scopes are documented.

Enter only the account subdomain in connection configuration, without a URL or domain suffix. Current documented requests have a 30-second timeout and do not follow redirects, so account credentials stay on the configured MemberVault host. The deprecated product tool retains its original HTTP client defaults.

## Tools

| Tool | Endpoint | Query parameters and behavior |
| --- | --- | --- |
| `get_courses` | `GET /get_courses` | No parameters besides `apikey`; returns the unmodified provider product response as `raw`. No pagination or response field schema is documented. |
| `list_products` (deprecated) | `GET /courses` (legacy) | Retains the original request, required normalized product fields, and handler behavior for existing workflows. Prefer `get_courses`. |
| `add_user_to_product` | `GET /add_user` | Required `email` and `course_id`; optional `first_name` and `last_name`. Existing users receive access without duplicate account creation. `course_id=-1` creates a user without product access. |
| `remove_user_from_product` | `GET /remove_user` | Required `email` and `course_id`. Revokes access to that product while retaining the user's account. |
| `delete_user` | `GET /delete_user` | Required `email`. Permanently deletes the user and their associated progress, quiz answers, and other data. This cannot be undone. |

Existing tool inputs and required output fields are retained. The deprecated `list_products` handler keeps its original `courseId`, `courseName`, `coursePrice`, `courseUrl`, and `courseStatus` mapping, including its original blank fallback for missing values. Those response fields and the legacy `/courses` route are not described by the current official documentation; their retention is solely for compatibility and does not assert that the provider guarantees them or has retired that route. The new `get_courses` tool returns the actual provider body unchanged as `raw`, with no assumed field names or invented defaults. Mutation tools also expose the original provider response as `raw`.

HTTP failures and explicit error responses become structured service errors. Mutation success follows a successful HTTP response without an explicit failure indicator; MemberVault does not document a mutation response schema, and the original response is retained for inspection. Transport errors recover provider response details from the HTTP client when available.

## Capability boundaries

The published API has no documented profile, account, current-user, user-search, or additional product-management endpoints. No identity operation is synthesized from the configured subdomain or product list. This is one API product and does not need separate tool categories.

MemberVault's Actions feature can call webhooks configured in its admin. The API documentation states that event subscription through the API is unavailable. This integration does not expose triggers or claim to configure Actions or Zapier-specific events.
