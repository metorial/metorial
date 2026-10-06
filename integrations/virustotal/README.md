# VirusTotal

Retrieve file, URL, domain and IP reports, inspect analysis status, browse indicator relationships and comments, and use licensed Intelligence, Livehunt and Retrohunt workflows. `scan_file` requests a rescan of an already known file hash; it does not upload a file. `scan_url` submits a URL and returns an analysis receipt, which does not prove completion.

Connect with an API key. Optionally supply the exact account username during setup to verify its owner and enable `get_connection_context`. That action returns available native user, privilege and quota fields without returning the API key. Existing token-only connections retain their report workflows and carry a connection label rather than an invented user identity. If the provider omits its owner-only proof, reconnecting with that username cannot establish ownership.

Use a key licensed for your intended use and endpoint privileges. The [Public API](https://docs.virustotal.com/reference/public-vs-premium-api) has four requests per minute and 500 per day and excludes commercial use and certain business workflows. Premium API and Intelligence/hunting privileges and quota are separate provider prerequisites; this integration does not infer them from a key's appearance or guarantee availability. A rate-limit error preserves the native status and safe provider code; no automatic mutation retry is performed.

The provider warns that [submitted or queried indicators can enter its public dataset](https://docs.virustotal.com/reference/domain-info). Use non-sensitive indicators. Comments, votes, analysis submissions and hunting jobs have retained effects. Livehunt creation retains the historical default of enabled rules unless `enabled: false` is supplied; enabled rules can generate notifications. Retrohunt creation consumes quota, and execution time/history depend on the hunting license. Deleting a ruleset is not proof that previous notifications, matches or consumed quota were erased.

Reports preserve native optional fields, zero sizes, nullable engine verdicts, UTC epoch seconds as legacy timestamp strings, and continuation cursors. Missing statistics are unknown rather than zero detections. The historical `fileTypeMime` output actually contains the provider's file type description; `fileTypeDescription` exposes the same value with an accurate name. Returned URL IDs are native SHA-256 IDs; input URL/base64 selectors are canonicalized by the provider.

This package provides 15 actions. It does not provide sample uploads/downloads, private scanning, feeds, graphs, account administration, or event registrations. Mutation receipts that cannot be verified fail with possible-effect guidance; they do not imply rollback. Read-only fixture comparisons and controlled retained-effect checks exist in the private test suite; authenticated live acceptance has not been verified in this refresh.

## License

[FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
