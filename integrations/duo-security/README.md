# Duo Security

Use a Duo Admin API application to read and manage users, groups, phones and administrators, generate bypass codes, discover protected applications, and read account utilization/settings and authentication, administrator and telephony logs. The 21 existing tools are retained, with one consolidated `get_resource` tool for exact group, phone, administrator or application details.

Use the exact API hostname from the Duo Admin Panel, including supported Federal hosts. An Auth API application is insufficient. New connections default to recommended v5 request signing; existing connections without a signing-version field retain v2 signing and legacy application-read routes. Select v5 explicitly to use current v3 application discovery with its documented resource-read grant. API grants, allowed client networks, synchronized clocks and the corresponding plan are required. No human identity or credential refresh is invented.

List tools return native continuation offsets and optional totals. Authentication logs use increasing millisecond bounds and their native two-part cursor. Existing v1 administrator/telephony log inputs remain available, but unsupported `maxtime`/`limit` fields refuse locally with current API guidance. Native logs can be delayed; a page does not prove complete absence of recent activity.

Enrollment email is validated before user creation. Partial relationship updates and uncertain enrollment retain the safe user ID and report confirmation honestly; no automatic retries or rollback are promised. Bypass-code generation invalidates existing codes. User deletion is permanent, does not immediately delete associated phones, and retains history. Administrator creation returns its native activation link and expiry when available. Application secrets are not returned.

## License

[FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
