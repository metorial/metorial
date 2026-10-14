# Coassemble API integration

Base URL: `https://api.coassemble.com/api/v1/headless`.

## Authentication

The recommended method accepts the full workspace API key and sends it directly in the `Authorization` header, without a Bearer prefix. Existing user-level keys use `COASSEMBLE-V1-SHA256 UserId=<userId>, UserToken=<token>`. The bearer method remains available for compatibility with existing connections; current workspace-key documentation does not recommend it.

[Errors and authentication guidance](https://developers.coassemble.com/errors) describes the workspace key format. [Release notes](https://support.coassemble.com/articles/release-notes-HcvM2zzVCE) confirm continued support for older user-level keys.

## Tools

- Courses: list, retrieve, read normalized content, duplicate, publish, revert, soft-delete, and restore.
- Embedding: issue a signed learner or author URL, with optional theme and learner profile fields. The existing URL route remains available; the provider marks it deprecated in favor of its newer embed API.
- AI generation: create a course using the current generation route. Optional audience, familiarity, tone, and screen count receive explicit defaults.
- SCORM: export a downloadable package in version 1.2 or 2004, dynamic or static. Export access requires the partner capability.
- Identities: list or retrieve a client/user; update client metadata, user metadata, name, avatar, or client association; delete identities with course ownership handling.
- Tracking: list course learner progress or soft-delete a learner's tracking, optionally scoped to a client. Outcome records remain available for reporting; hosted SCORM resume state and runtime logs are removed.

Course, user, and client lookup tools preserve the provider response fields. List pagination starts at page zero. Each list call returns the requested page; callers choose subsequent pages.

## Official references

- [Courses](https://developers.coassemble.com/api/courses)
- [Generation](https://developers.coassemble.com/api/generate)
- [Identities](https://developers.coassemble.com/api/identities)
- [Tracking](https://developers.coassemble.com/api/tracking)
- [Course Builder](https://developers.coassemble.com/embeddables/course-builder)
- [Course Player](https://developers.coassemble.com/embeddables/course-player)

Provider webhooks and browser events are outside this integration's current tool scope.
