# ExpoFP integration

## API surfaces

- JSON API: `https://app.expofp.com/api/v1`; authenticated POST requests with `token` in the JSON body. Event, exhibitor, booth, category, extra, session, speaker, and track tools use this API.
- Offline Data API: `https://app.expofp.com/api/v2/expo-offline`; public GET endpoints for versioned ZIP archives. These requests never include the account token.

## Discovery and authentication

Use `list_events` to discover event IDs and expo keys before event-scoped operations. Connection validation counts the authorized event list. ExpoFP's public documentation does not advertise a current-account endpoint, so no identity tool is invented.

## Offline archive workflow

1. `get_offline_plan` reads `/{expoKey}/get/latest`. A null state means no archive exists; this operation does not start a build.
2. `prepare_offline_plan` reads `/{expoKey}/get-or-create/latest`, which starts a build if needed.
3. Repeat preparation after about 120 seconds while a build is pending. A completed state is current only when `status` is 2 and `version` equals `versionActual`.
4. A current completed archive is offered as a downloadable ZIP from the provider's `fileUrl`. Versioned archive URLs do not require the account token.

Archive preparation returns immediately with the current state; it does not poll inside the invocation. Historical archives are not presented as the latest floor plan while a newer version is pending.

## Compatibility and limits

Existing JSON tool keys, input types, enum values, output types, and field requirements are retained. IDs remain JSON numbers and are checked as positive safe whole numbers before requests. Required provider output fields are validated rather than replaced with empty strings, false flags, zero IDs, or empty relationships.

The current full JSON reference and machine-readable specification require an ExpoFP account or API token. Detailed JSON request and response mappings remain inherited contracts until checked against that reference; they are not inferred from third-party examples. This refresh adds no guessed JSON mutations, media endpoints, or webhook handlers.

## References

- [JSON API and authentication](https://developer.expofp.com/guide/json-api)
- [Offline Data API](https://developer.expofp.com/guide/offline-api)
- [Online and offline loading](https://developer.expofp.com/guide/plan-loading-modes)
- [Previous provider reference](https://expofp.docs.apiary.io/) — retired location; the public guide identifies the current replacement.
