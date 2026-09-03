# Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2A specification

## Purpose

Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2A exposes the high-value tools of the sensitive-scope Google verification group through one Google OAuth connection. Source handlers, schemas, tags, and file behavior are imported and rebound to this integration. Aggregate-owned metadata overrides keep endpoint-specific scopes and public guidance accurate without reimplementing handlers.

The former single Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2 aggregate (one P2 project, 119 requested scopes) was split into two super apps, each with its own Google Cloud project and verification: Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2A / project P2A holds the high-value families; Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2B / project P2B holds Photos, YouTube, YouTube Analytics, and Workspace Admin. Google Analytics and Google Classroom were part of the split and were removed from their super apps the same day (see Tools not included). One project per super app is the model for every Super Google integration: the project's declared scope set and the app's consent request are the same list. The split was made because a single request for all 119 sensitive scopes produced authorization URLs Google would not serve, and because YouTube and Drive scopes cannot share one request.

## Sources

The integration imports tools, but not triggers, from:

- Google Docs
- Google Sheets
- Google Slides
- Google Forms
- Google Calendar
- Google Meet
- Google Contacts
- Google Tasks
- Google Ads
- Google Search Console
- Google Tag Manager

The source inventory contains 136 tools. This integration exposes all 136, including six collision aliases, and records no omissions.

Google Meet is placed in this sensitive-scope project rather than the restricted one because every Meet tool runs on `https://www.googleapis.com/auth/meetings.space.created` against the Meet API; no Drive scope beyond `drive.file` is requested. Recording, transcript, and smart-note artifacts are returned as Drive or Docs references whose contents are read through a Google Drive connection.

## Authentication and configuration

The single `google_oauth` method requests the P2A Google Cloud project declaration in Console order (`src/scope-envelope.ts`, 48 scopes): consent equals declaration. The list is built from the envelope, and every entry carries consent-screen copy typed against the envelope, so adding or removing a declared scope without updating the copy fails compilation.

The declaration is exactly the union of the consent lists of the eleven source integrations; the contract test recomputes that union from the source auth stacks at runtime and fails on drift. It covers Google Meet (`meetings.space.created`, `meetings.space.readonly`, `meetings.space.settings`), the full Calendar scope family, Contacts and Directory, Tasks, Ads, Search Console, Tag Manager (including container deletion and publishing), Docs, Sheets, Slides, Forms, `drive.file`, `userinfo.email`, and `userinfo.profile`. The bare `openid`, `email`, and `profile` scopes left with Google Analytics, the only source that requested them.

**`drive.file` is requested.** Google's authorization server rejects any single request that combines a Drive scope with YouTube scopes (`Error 400: invalid_request — This request contains scopes that cannot be requested together`). Because YouTube is served by Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2B in its own project, this app can request `drive.file`, and the Drive-backed Docs and Sheets tools (`create_document_markdown`, `update_document_markdown`, `list_documents`, `delete_spreadsheet`) are included; each of their scope clauses accepts `drive.file`, so they operate on files created or opened through this connection. The contract test asserts that no YouTube, Classroom, Photos, Admin, or Analytics scope is declared or requested here.

Two requested scopes back planned tools and are referenced by no retained tool clause yet (`calendar.calendars.readonly`, `calendar.acls.readonly`); they are tracked in `superGoogle2AFutureToolScopes`. `userinfo.email` and `userinfo.profile` are the identity scopes for the profile lookup. The contract test fails if a requested scope is neither used by a tool, an identity scope, nor listed as a future-tool scope. No Google-restricted Gmail, Drive, or Chat scope is requested or declared in this project. The OAuth input also requires a Google Ads developer token, which is persisted with the OAuth output for Ads API requests. Refreshes retain both the refresh token and developer token.

Optional configuration preserves the exact fields consumed by imported handlers:

- `loginCustomerId` for Google Ads manager-account requests

The Workspace Admin fields (`domain`, `customerId`) moved to Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2B with the Admin tools; the Analytics fields (`propertyId`, `measurementId`) left with Google Analytics.

## Renamed tools

- `google-ads/list_accounts` → `ads_list_accounts`
- `google-tag-manager/list_accounts` → `tag_manager_list_accounts`
- `google-docs/manage_named_ranges` → `docs_manage_named_ranges`
- `google-sheets/manage_named_ranges` → `sheets_manage_named_ranges`
- `google-sheets/batch_update` → `sheets_batch_update`
- `google-slides/batch_update` → `slides_batch_update`

## Tools not included

No tool of the eleven sources is omitted. No source trigger is imported.

Google Analytics (13 tools; `analytics.readonly`, `analytics.edit`, `analytics.manage.users`, `analytics.manage.users.readonly`, `analytics.provision`, and the bare `openid`, `email`, `profile` scopes) was removed from this super app on 2026-09-03. Live consent tests on one Workspace tenant hung indefinitely with no error for every `analytics.*` scope while every other 2A family consented normally. The leading explanation is that Google Analytics is an "additional Google service" the tenant admin had turned off for the user's organizational unit (Google has not confirmed this). Because consent is all-or-nothing for a super app, one such family would block every other family for affected users. The standalone Google Analytics integration remains the way to use Analytics tools.
