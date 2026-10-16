# TalentHR

Manage TalentHR employee profiles, hiring, organizational structure, time-off requests, and applicant tracking. Discover employee and job-position IDs, inspect leave budgets and calendar data, and approve or reject leave requests.

Connect an API key from **Settings > Domain > API**. TalentHR uses HTTP Basic authentication with the key as the username. Read-only keys support GET tools; create, update, and approval tools require a full key. API availability and optional profile fields depend on the TalentHR plan.

Directory, candidate, and time-off request tools return one page. Their `count` describes that page; `total`, when provided, is TalentHR's matching total. Existing page defaults remain 100 records and offset 0; the provider maximum is 100.

Creating a location requires `name`, `address`, and `isRemote`. Employee updates accept partial input: when a required first name, last name, or work email is omitted, the tool reads the current profile and sends the existing values with the update. This extra read must succeed before the update can proceed.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
