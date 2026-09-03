# Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 3 specification

## Purpose

Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 3 combines the tool surfaces of eight Google Cloud and Firebase integrations behind one OAuth connection. It imports the existing tool definitions and handlers; it does not copy or reimplement provider operations.

## Sources and inventory

| Source integration | Tools | Imported | Omitted |
| --- | ---: | ---: | ---: |
| Google Compute Engine | 29 | 29 | 0 |
| BigQuery | 28 | 28 | 0 |
| Google Cloud Storage | 12 | 12 | 0 |
| Google Cloud Functions | 10 | 10 | 0 |
| Google Cloud Speech | 10 | 10 | 0 |
| Google Cloud Vision | 11 | 11 | 0 |
| Google Address Validation | 2 | 2 | 0 |
| Firebase | 12 | 12 | 0 |
| **Total** | **114** | **114** | **0** |

The Cloud Functions and Cloud Speech `get_operation` keys would collide. They are exposed as `functions_get_operation` and `speech_get_operation`, respectively. These are aliases, not omissions. Triggers are outside the aggregate tool surface.

## Authentication and scopes

The sole auth method is `google_oauth`. It persists the access token, refresh token, expiry, and `authMethod: "oauth"`, refreshes expiring tokens, and resolves the connection profile from Google userinfo.

The consent set is the complete P3 Google Cloud project declaration (14 scopes, Console order), so the consent screen matches the verified Data Access declaration exactly:

- `https://www.googleapis.com/auth/cloud-platform` satisfies every included Google Cloud and Firebase tool call.
- `compute`, `compute.readonly`, `cloud-platform.read-only`, `devstorage.full_control`, `devstorage.read_write`, `devstorage.read_only`, `cloud-vision`, and `firebase.database` are the narrower alternatives declared by the source tools' scope clauses.
- `bigquery`, `bigquery.readonly`, and `bigquery.insertdata` back planned BigQuery tools and are referenced by no retained tool clause yet; they are tracked in `superGoogle3FutureToolScopes`.
- `https://www.googleapis.com/auth/userinfo.email` and `https://www.googleapis.com/auth/userinfo.profile` provide connection identity.

The contract test fails if a requested scope is neither used by a tool, a profile scope, nor listed as a future-tool scope, or if any Google-restricted P1 scope enters the list.

## Configuration mapping

The aggregate config is mapped per source before an imported handler is invoked. In particular, Cloud Functions receives `functionsRegion` as its `region`, while Cloud Speech receives `speechRegion` as its `region`. This preserves their different defaults without changing either handler.

`projectId` is optional at connection setup. Tools that need a Google Cloud project still require a usable project context at invocation time. Firebase-specific settings remain optional and are forwarded only to Firebase handlers.

## Compatibility guarantees

- Every source tool is explicitly listed in the manifest.
- Only tools are composed; source triggers are excluded.
- Input/output schemas, tags, scopes, descriptions, and handlers are preserved.
- Every imported tool is rebound to the aggregate specification and `google_oauth` method.
- Production tool IDs remain under 60 characters.
