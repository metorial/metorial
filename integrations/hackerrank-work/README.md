# HackerRank Work

Manage technical hiring with HackerRank Screen and HackerRank Interview: create and configure assessments, invite and track candidates, retrieve downloadable candidate PDF reports, and schedule or update live coding interviews. Discover questions and templates, provision users, and manage teams and memberships.

Generate a personal API token in HackerRank for Work **Settings > API**. Tool access follows the token owner's permissions. This integration uses the Work v3 API; it does not connect to SkillUp.

Use `list_tests`, `list_candidates`, `list_users`, `list_teams`, `list_questions`, `list_interview_templates`, and `list_invite_templates` to discover resource IDs. Pagination uses `limit` and `offset`; list responses preserve the provider's next-page URL and original response.

Creating a test requires a name, duration, role IDs, and one or more documented experience levels. The legacy single `experience` string is sent as a one-element array; `experienceLevels` supports multiple values. Creating a user requires email, firstname, role, and teamIds. Updating an interview's interviewer list replaces the previous list.

Candidate invitations record an invite without sending email unless `sendEmail` is true. Candidate PDF retrieval retries temporary HTTP 503 responses up to three times within a shared 20-second budget. Persistent failures remain visible; request the report again later. Returned report URLs have the provider's own lifetime; request a fresh report if a download link expires.

Legacy user timezone, existing-user email changes, team description, interview timezone, and test candidateTabSwitch inputs retain their original forwarding behavior. The current write definitions do not document these fields, so their provider behavior remains unverified. For scheduling, use timestamps with explicit UTC offsets.

## API reference

- [Official API reference](https://www.hackerrank.com/work/apidocs)
- [Official machine-readable Swagger reference](https://www.hackerrank.com/apidoc)
- [API overview and token setup](https://support.hackerrank.com/articles/2067417637-api-overview)

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
