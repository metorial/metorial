# VirusTotal integration specification

The integration uses the documented classic API v3 at `https://www.virustotal.com/api/v3` with `x-apikey` authentication. API-key renewal is a user reconnection, not OAuth refresh. No API key is placed in a path or returned in tool output. Optional username setup uses [GET /users/{id}](https://docs.virustotal.com/reference/user) and the [owner-only apikey attribute](https://docs.virustotal.com/reference/user-object) to prove the stored user binding. No undocumented `me` alias is required. Legacy token-only report connections remain usable; user context requires verified setup.

| Capability | Actions and native contract |
| --- | --- |
| Reports | `get_file_report`, `get_url_report`, `get_domain_report`, `get_ip_report`: exact native object envelopes; file lookup accepts SHA-256/SHA-1/MD5, URL lookup accepts URL/base64/native SHA-256. |
| Analysis | `scan_file`: POST existing hash `/analyse`; `scan_url`: form POST `/urls`; `get_analysis_status`: exact analysis GET, queued/in-progress/completed status. Accepted receipt is not completed analysis. |
| Community | `get_comments`, `add_comment`, `add_vote`: documented indicator collections, exact nonempty receipts and observed text/verdict; votes return their native ID additively. |
| Relationships | `get_relationships`: documented relationship names, encoded exact indicator paths, list or single-object native responses normalized to the retained list output. Native unavailable related-object errors remain explicit. |
| Intelligence | `search_intelligence`: licensed advanced corpus search; optional descriptors, order and cursor; maximum native search page size 300. |
| Hunting | `manage_livehunt_ruleset`: documented list/get/create/PATCH/delete; update includes exact body ID, no silent empty update. `manage_retrohunt`: list/get/create/matches, main/goodware corpus and optional completion email. |
| Context | `get_connection_context`: safe owner-verified native user/privilege/quota projection; omitted privilege/ownership evidence remains unknown. |

Every public legacy action and input field is retained. Output additions are optional. `fileTypeMime` retains its historical description value but no longer falsely promises MIME semantics; use `fileTypeDescription`. Engine `result: null` stays null. No missing IDs or statistics are fabricated. Page cursors are opaque and returned without following provider-provided links; repeated cursors, malformed collections and explicit limit overruns fail. One response is bounded to 4 MiB; no automatic retries or unbounded enumeration occurs.

Provider errors become user-facing service failures with safe operation/status/code metadata and no raw transport parent. Known connection-key reflections are screened from full response data before projection; this is bounded protection, not a claim that shared internal trace capture or every unknown encoding is secret-free. No shared transport semantics were changed.

[Public/Premium limits](https://docs.virustotal.com/reference/public-vs-premium-api), [quota consumption](https://docs.virustotal.com/docs/quota-consumption) and [dataset inclusion](https://docs.virustotal.com/reference/domain-info) are provider prerequisites. Hunting coverage does not imply broader account entitlements. Private tests require explicit isolated/retained-effect acceptance before any submission or mutation and gate destructive ruleset cleanup when complete native association proof is unavailable. No trigger registrations, sample transfers, graph/administration breadth or fabricated cleanup are implemented.
