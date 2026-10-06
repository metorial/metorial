# Recruitee ATS integration

Authentication uses the current personal ATS Bearer-token flow and company-scoped API at `https://api.recruitee.com/c/{company_id}`. Current reference paths also accept the company subdomain. New setup uses a human-readable subdomain; the optional legacy numeric company ID remains compatible with stored connections. Native `/admin` within the company scope binds the connection to exact company and admin IDs. The unscoped Basic-auth `/admin` flow is outside this integration.

## Tools

| Key | Provider operations and behavior |
| --- | --- |
| get_current_identity | GET company-scoped `/admin`; whitelist owner, company, role, and membership fields |
| create_candidate | POST `/candidates` with candidate and optional offers; manual creation does not send the application confirmation email |
| get_candidate | GET `/candidates/{id}`; profile, fields, tags, current placements and their exact parent/stage identifiers |
| update_candidate | PATCH profile and/or PATCH `/candidates/{id}/update_cv`; CV-only avoids an empty profile request; partial acceptance is reported |
| delete_candidate | DELETE `/candidates/{id}`; exact returned ID and actual deletion timestamp; logical deletion and possible retained history |
| search_candidates | GET `/candidates` with limit/offset or GET `/search/new/candidates` with filters_json/page; no ignored mixed filters |
| manage_candidate_notes | GET/POST candidate notes, DELETE `/notes/{id}`; rich-text document payload, exact candidate ownership and absence after deletion |
| manage_candidate_tags | GET `/tags`; POST/DELETE candidate tags; explicit names and native candidate readback |
| set_candidate_custom_fields | POST one `/custom_fields/candidates/{id}/fields` per field; validated name/value objects, returned field IDs and partial-effect recovery |
| create_offer | POST `/offers`, optional dedicated status transition then native status readback |
| get_offer | GET `/offers/{id}`; full data and pipeline stages, with native pipeline-template read when necessary |
| update_offer | PATCH `/offers/{id}` plus dedicated draft/publish/unpublish/close/archive route when requested; readback and partial-effect guidance |
| delete_offer | GET then DELETE `/offers/{id}` and independent GET 404; no initial-404 success or erasure promise |
| list_offers | GET `/offers`, current pagination/status/ID filters; retained deprecated kind/scope/view_mode and actual optional meta |
| manage_pipeline | POST `/placements`; PATCH change_stage/disqualify/requalify; DELETE placement followed by candidate readback; optional candidate identity guard |
| list_departments_locations | GET `/departments` and `/locations` |
| list_disqualify_reasons | GET `/disqualify_reasons` |
| download_candidate_file | Fresh candidate/file listing; absolute HTTPS provider file for CV, cover letter, or exact file ID; no ordinary output of bytes or download URL |

All 15 legacy tool keys, enum values and numeric inputs remain. Required output kind/timestamps become optional where current offers omit them; a placement can have a talent-pool ID instead of an offer ID. IDs and counts must be safe exact integers. Native salary/number field decimal strings are passed through without arithmetic or rounding. Runtime validation and service failures use structured errors; transport credentials and raw error parents are discarded by the primary adapter.

`scope=active` retains the documented deprecated meaning published and closed, not every non-archived offer. `not_archived` covers all except archived. Offer pagination changed effective December 2025; current lists expose page/limit/total_count when returned. Basic candidate lists accept at most 1000 records per request. Basic candidate search can suggest a next offset after a full page, without claiming a known total.

Pipeline disqualification requires a configured reason ID; hiring can require work-location and requisition-opening IDs. Recruiting automations may run on mutations. Removing a placement does not delete the candidate. Candidate deletion is restorable in the full current reference; earlier brief documentation uses stronger permanent-deletion wording, so this integration makes no erasure guarantee.

File URLs must be current native absolute HTTPS addresses, never guessed from relative examples. Bearer headers are used only for exact api.recruitee.com URLs. The current reference does not document a file URL expiration or renewal mechanism; no unsupported expiry time is invented. Request the file again when the provider URL is unavailable.

## Official sources

- [Getting started and company-scoped personal tokens](https://docs.recruitee.com/reference/getting-started)
- [Full current ATS API reference](https://apidocs.recruitee.com/)
- [Candidate creation](https://docs.recruitee.com/reference/candidates-post)
- [Candidate listing](https://docs.recruitee.com/reference/candidates-get)
- [Advanced candidate search](https://docs.recruitee.com/reference/searchnewcandidates)
- [Candidate profile fields](https://docs.recruitee.com/reference/custom_fieldscandidatesidfields-post)
- [Offer listing](https://docs.recruitee.com/reference/offers-get)
- [December 2025 offer and rate-limit changes](https://www.tellent.com/hubfs/API%20Changes_Offers%20and%20Rate%20Limiting.pdf)
