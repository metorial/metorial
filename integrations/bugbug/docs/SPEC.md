# BugBug API capabilities

BugBug provides cloud test automation for web applications. This integration uses API v2 and a project API token from the Integrations page, API tab. Requests authenticate with `Authorization: Token <api-token>`. Public API access requires a paid plan.

The integration supports discovering tests, suites, profiles, and authorized projects; running tests or suites; reviewing and stopping runs; and downloading JUnit XML reports. Run profile IDs come from `list_profiles`; project IDs and names can be checked with `list_projects`.

Run requests send `testId` or `suiteId`, optional `runProfileId`, and optional variable overrides as a `variables` array of `{ key, value }` objects. Run creation and stopping return a state object whose `id` is exposed as the existing `testRunId` or `suiteRunId` output.

API v2 run results use `name`, `ended`, and `profileName`. The integration maps these to the existing test/suite name, `finished`, and `runProfileName` output keys. Duration remains a number of milliseconds; formatted provider durations are converted, with start/end timestamps as a fallback. Deleted tests or suites can leave run resource IDs null. Suite result counts are derived from the returned `testRuns`.

Metadata that the API does not always expose, including creation timestamps, favorite flags, profile variables, and browser configuration, is optional in tool outputs. No placeholder values are invented for absent fields. Test group IDs and nested steps are returned when the provider supplies their structured data.

JUnit downloads use the documented GET endpoints `/testruns/{id}/report/junit/` and `/suiteruns/{id}/report/junit/`. JSON and CSV report downloads are not advertised by this integration.

Official references:

- [Public API and token authentication](https://docs.bugbug.io/integrations/public-api)
- [API v2 Swagger reference](https://app.bugbug.io/docs/swagger/?version=v2)
- [API v2 machine-readable schema](https://app.bugbug.io/docs/schema/?version=v2)
- [Official SDK reference](https://app.bugbug.io/sdk/docs/index.html)
