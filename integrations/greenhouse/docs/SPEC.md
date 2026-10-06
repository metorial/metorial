# Greenhouse capability specification

Harvest v3, OAuth bearer authentication, fixed official API origin. Custom client credentials and approved partner authorization-code credentials support refresh. Retired API keys and `onBehalfOf` configuration fail locally with reconnection instructions.

23 public tools retain 19 existing keys: candidate list/get/create/update, application list/get/advance/reject, job list/get/create, offer list, user list/get, department list, office list, interview list, candidate notes and candidate tags. Additions: `get_current_context`, `list_rejection_reasons`, `list_application_attachments`, `download_application_attachment`.

Inputs retain the existing property types, optionality and enum values. Unsupported v1 combinations fail explicitly before requests. Lists add optional opaque cursors and return the provider’s next-page state. Data schemas allow omitted and nullable documented fields. Removed expanded relationships are omitted, while v3 relationship IDs remain available. Numeric resource IDs must be positive safe integers represented exactly.

Writes validate required v3 payloads and resource ownership. Candidate responses confirm requested fields. Application changes read back exact candidate/application/job relationships and the resulting stage or rejection state. Stage moves can run provider automation; rejection emails are requests for scheduling rather than proof of delivery. Tag writes act on exact candidate membership records. No automatic retry, hidden extra application creation, global tag deletion or job deletion is provided.

File discovery excludes signed download URLs from ordinary metadata. Downloads verify application ownership, then provide the provider file URL without forwarding OAuth credentials. Renewal refetches the same file ID and application binding after the documented seven-day URL lifetime.

No triggers are registered. No recruiting administration, hiring, offer approval, interview scheduling, candidate merging, anonymization or onboarding capability is advertised.
