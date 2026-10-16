# D2L Brightspace

Manage users, course offerings, enrollments, numeric grades, assignments, content modules, discussions, announcements, calendar events, and awards. Read quizzes, attempts, assignment submissions, groups, and sections. Discover organization unit types, organization units, and enrollment roles.

Connect with Brightspace OAuth or an existing bearer token and the HTTPS origin of your institution’s Brightspace instance. OAuth refresh retains replacement tokens and connection state. Requests use the instance selected with the credentials; older connections can retain their stored instance URL.

Call `get_user` with no lookup fields to identify the connected user. Call `list_enrollments` without IDs to discover the user’s courses, or use `list_org_units` and `list_org_unit_types` for organization searches. Use `list_award_associations` before issuing an award; Brightspace requires nonempty criteria and evidence.

The default API versions are Learning Platform 1.49, Learning Environment 1.82, and Awards 1.4. The institution must support the selected versions and grant the relevant user permissions and OAuth scopes. `core:*:*` supports API routes that use Brightspace’s general fallback scope.

See [the capability reference](docs/SPEC.md) and [official API documentation](https://docs.valence.desire2learn.com/).

## License

[FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
