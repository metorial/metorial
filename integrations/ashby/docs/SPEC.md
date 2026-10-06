# Ashby integration specification

The integration exposes 15 public tools covering candidates, applications, jobs, offers, interview schedules and prerequisite-resource discovery, plus API-key identity and downloadable files. It targets current documented public API requests on `https://api.ashbyhq.com`; the audited reference is `2026-01-01`. No legacy event handlers remain.

Authentication uses an API key as the HTTP Basic username with an empty password. `apiKey.info` validates the connection and supplies key title, scopes and observed version, so `apiKeysRead` is required in addition to individual endpoint permissions. API-key secrets and Basic encoding are excluded from results/errors; transport errors retain bounded status information without request/response parents. The integration does not select or invent an API-version header.

Candidate creation maps legacy first/last name fields to native `name`, and primary contacts to `email` and `phoneNumber`. Legacy nonpersonal contact types fail before writes. Candidate search requires a unique match. Candidate detail preserves exact file handles, nullable location/resume metadata and whether optional custom fields were supplied. Profile/tag/note/project operations remain separate; no deletion or anonymization cleanup is claimed.

Jobs require explicit native `teamId` (legacy `departmentId`) and `locationId` on creation. `job.info` uses `id`. Status filtering uses `job.list`, while search uses native `title` and a bounded `limit`. Compensation uses documented tiers/components and replaces the existing tiers; an empty tier array is an explicit clear. Compound changes return accepted action receipts and exact readback, without atomicity or all-fields persistence guarantees.

Applications preserve exact candidate/job/stage relationships. Transfer requires a target stage and plan, with default-plan hydration bound to the exact target job only. Hiring-team membership maps legacy user/role fields to native `teamMemberId`/`roleId`; role names require unique documented discovery. Automatic activities and history can persist.

Offer operations distinguish offer-process, form-instance, record and version identities. `offer.start` returns a form instance, `offer.create`/`offer.update` submit native field submissions and `offer.approve` force-approves the selected latest version. Prepared processes are a separate provider prerequisite. Native offer top-level timestamps are absent, so legacy timestamp output requirements are relaxed rather than filled with invented values. Native latest-version null is preserved.

Scheduling maps selected enabled user IDs to independently retrieved user emails. Existing-event updates require event IDs that belong to the exact selected schedule and preserve the selected interview definition. Updates deny feedback deletion. The provider enforces same-key creation ownership. Calendar delivery and cancellation can have additional effects.

Discovery includes only documented prerequisites for retained workflows. Source/archive-reason/hiring-role/stage listings are nonpaginated; the stage endpoint requires an interview plan. Other list requests use native `limit`, cursor and syncToken. Optional page flags and nullable tokens remain faithful. Cursor/sync expiration requires a full restart without both tokens; no automatic duplicate-prone retry occurs. User search requires an exact email.

Custom-field writes accept supported Candidate/Application/Job/Opening types and explicit null clears, inspect `success` even at HTTP 200 and require the returned field identity. The legacy Offer enum is retained with explicit remediation to native offer forms.

Files use the exact provider handle returned by candidate/offer metadata. `file.info` supplies a provider storage URL with no documented expiry; renew it before every download. File bytes/URLs are not placed in ordinary tool output. Generated demo-file availability and deployed file delivery remain provider/runtime limitations.

Private coverage is active and fixture controlled. Independent HTTP observers prove readbacks. Reversible synthetic name/field changes and owned empty draft archival require explicit isolated-account authorization, no concurrent changes/automation and accepted retained history. Candidate/application/offer/schedule writes without complete safe retirement proof remain individual gated scenarios. These gates do not imply a suite skip or live success.

Primary references: [API documentation index](https://developers.ashbyhq.com/llms.txt), [authentication](https://developers.ashbyhq.com/docs/authentication), [pagination](https://developers.ashbyhq.com/docs/pagination-and-incremental-sync), [responses](https://developers.ashbyhq.com/reference/responses), [offer.create](https://developers.ashbyhq.com/reference/offercreate), [schedule.update](https://developers.ashbyhq.com/reference/interviewscheduleupdate), [file.info](https://developers.ashbyhq.com/reference/fileinfo).
