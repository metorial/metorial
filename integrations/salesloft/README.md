# <img src="https://provider-logos.metorial-cdn.com/salesloft.png" height="20"> Salesloft

Manage people, accounts and notes through the Salesloft v2 API. Discover cadences and memberships, enroll or remove people, read email and call activity, log completed external calls, and read tasks, templates and users.

## Tools

| Capability | Tools |
| --- | --- |
| People | Create, get, update, delete and list people |
| Accounts | Create, get, update, delete and list accounts |
| Notes | Create, get, update, delete and list notes |
| Cadences | List/get cadences, list memberships, add/remove a person |
| Activity | List emails/calls and log a completed external call |
| Templates | List and get email templates |
| Tasks | List and get tasks |
| Identity | List users and get the current user |

The integration provides 29 tools. It does not create cadences, send emails, place calls, complete tasks, import/export cadences or configure webhooks.

## Authentication and permissions

Use OAuth for partner applications, or an issuing user's API key for a customer integration. Both use Bearer authentication. OAuth access tokens expire; refresh preserves rotating refresh tokens. The OAuth method requests the read, write and delete scopes needed for the tools above, including privileged `email_contents:read` for explicitly requested email subjects. API key access also depends on the issuing user's permissions.

## Behavior and effects

Lists use provider page numbers with `perPage` from 1 to 100. Follow `paging.nextPage` with the same filters. Case-insensitive template title/subject prefixes are applied to each provider search page; a filtered page can be empty while `nextPage` still exists. `currentUser: true` selects the authenticated user's task assignment; false applies no assignment filter. Current task state and completion are returned; the older optional `status` field is not supplied by the current API.

Email subjects require `includeSubject: true` and the privileged scope. Call notes require note-read access and are fetched from their linked note records. Logging records an already completed external call; it does not dial, but it can persist call and CRM history. Enrollment can start outreach and create work. Removing membership does not erase historical activity or prove pending work has stopped. Person, account and note deletion may be irreversible without provider support. Use a dedicated test context for automated lifecycle testing.

Returned records omit credential metadata and authenticated URLs, and redact connection-token values from ordinary text and custom fields.

## Official documentation

- [API reference](https://developers.salesloft.com/docs/api/)
- [OAuth](https://developers.salesloft.com/docs/platform/api-basics/oauth-authentication/)
- [Scopes](https://developers.salesloft.com/docs/platform/api-basics/scopes/)
- [Paging and filtering](https://developers.salesloft.com/docs/platform/api-basics/filtering-paging-sorting/)

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
