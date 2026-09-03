# Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2B specification

## Purpose

Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2B exposes the lower-priority tools of the sensitive-scope Google verification group through one Google OAuth connection. Source handlers, schemas, tags, and file behavior are imported and rebound to this integration.

The former single Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2 aggregate (one P2 project, 119 requested scopes) was split into two super apps, each with its own Google Cloud project and verification: Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2A / project P2A holds the high-value families; Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2B / project P2B holds Photos, YouTube, YouTube Analytics, and Workspace Admin. Google Classroom was part of P2B at the split and was removed the same day (see Tools not included). One project per super app is the model for every Super Google integration: the project's declared scope set and the app's consent request are the same list. The split was made because a single request for all 119 sensitive scopes produced authorization URLs Google would not serve, and because YouTube and Drive scopes cannot share one request.

## Sources

The integration imports tools, but not triggers, from:

- Google Photos
- YouTube
- YouTube Analytics
- Google Admin

The source inventory contains 63 tools. This integration exposes all 63 with no aliases and no omissions. Workspace Admin `manage_alerts` is not in the source inventory: google-admin does not register it because the Alert Center API is service-account-only and Google rejects `apps.alerts` as invalid for a user OAuth client.

## Authentication and configuration

The single `google_oauth` method requests the P2B Google Cloud project declaration in Console order (`src/scope-envelope.ts`, 42 scopes): consent equals declaration. The list is built from the envelope, and every entry carries consent-screen copy typed against the envelope, so adding or removing a declared scope without updating the copy fails compilation.

The declaration is exactly the union of the consent lists of the four source integrations; the contract test recomputes that union from the source auth stacks at runtime and fails on drift. It covers Photos, YouTube (including `youtube.upload`, `youtubepartner`, `youtubepartner-channel-audit`, and `yt-analytics-monetary.readonly`), Workspace Admin Directory/Reports/Licensing/Data Transfer, `userinfo.email`, and `userinfo.profile`.

**No Drive scope is requested.** Google's authorization server rejects any single request that combines a Drive scope with YouTube scopes (`Error 400: invalid_request — This request contains scopes that cannot be requested together`). The contract test asserts that no `/auth/drive*` scope is ever declared next to YouTube, and that no Classroom, Calendar, Meet, Contacts, Tasks, Docs, Sheets, Slides, Forms, Analytics, Ads, Search Console, or Tag Manager scope is declared here.

Two requested scopes back planned tools and are referenced by no retained tool clause yet (`youtube.channel-memberships.creator`, `apps.groups.settings`); they are tracked in `superGoogle2BFutureToolScopes`. The contract test fails if a requested scope is neither used by a tool, an identity scope, nor listed as a future-tool scope. No Google-restricted Gmail, Drive, or Chat scope is requested or declared in this project. No additional OAuth input is collected; the credential is the plain Google OAuth output.

Some requested families require the connected account to have the product (`admin.*` a Workspace administrator, `youtubepartner*` a YouTube Partner or CMS account). When the consent page fails with a server error or an endless loader, bisecting the requested scope list (see the CLI `--incremental --scopes` flow) isolates the scope. The leading explanation is a Google service that the tenant admin has turned off for the user's organizational unit; that is what is suspected for Classroom, but Google has not confirmed it.

Optional configuration preserves the exact fields consumed by imported handlers:

- `domain` and `customerId` for Workspace Admin

## Renamed tools

None.

## Tools not included

No tool of the four sources is omitted. No source trigger is imported.

Google Classroom (19 tools, 24 `classroom.*` scopes) was removed from this super app on 2026-09-03. Live consent tests on one Workspace tenant hung indefinitely with no error for every `classroom.*` scope while every other 2B family consented normally. The leading explanation is that Classroom is an "additional Google service" the tenant admin had turned off for the user's organizational unit (Google has not confirmed this). Because consent is all-or-nothing for a super app, one such family would block Photos, YouTube, and Admin for affected users as well. The standalone Google Classroom integration remains the way to use Classroom tools.
