# Vonage

Eleven tools cover Messages v1, SMS, Voice v1, Verify v2, Number Insight, Numbers, Applications v2, account balance and restricted Subaccounts APIs. Existing tool keys and input types are retained.

Connect with an account API key and secret. Voice requires an application ID and matching unencrypted RSA private key; PKCS#1 and PKCS#8 PEM are supported. Messages and Verify support basic account authentication or application JWTs; application callbacks and advanced features require application setup. Account balance validates account access; it is not a current-user identity endpoint.

Use `manage_applications` list/get to discover exact application IDs. Creation requires `publicKey` from a keypair you already saved. Private keys are not returned. Updates read existing native settings, preserve omitted settings, and translate the public webhook fields to native names; there is no compare-and-swap guarantee. Subaccount creation requires a `subaccountSecret` you already hold securely and restricted API access. Secrets are omitted from public results.

Use `list_calls` with `callUuid` for an exact call read. List results expose native page metadata and next offsets/pages; number pages start at 1. Charges remain native decimal strings where supplied as strings. Balance and transfers use native numeric EUR fields. Every SMS part must have native status 0; partial failure can leave previously accepted parts and charges. Messages, calls and verification creation receipts prove acceptance, not delivery or completion.

Native list metadata must agree with the returned page; incomplete pages are refused rather than presented as complete or advanced past missing records. Numeric financial fields refuse unsafe integer precision without changing their units or guessing a decimal scale. Partial SMS failures expose accepted message IDs in safe error metadata for reconciliation; do not resend the complete multipart request blindly. Text bodies preserve line breaks, and calls support the documented 1–86400 second length timer.

Number Insight is scheduled to sunset February 4, 2027. Its advanced statuses 43–45 are partial results. Consult the [transition notice](https://developer.vonage.com/de/api/number-insight?source=number-insight) before migrating to Identity Insights. Sender onboarding, channel provisioning, 10DLC, regional restrictions, verification pricing and account permissions apply.

No video API, native exports, generic OAuth, current-user endpoint, or trigger registrations are included. There are no automatic retries or invented undo guarantees. Permanent application deletion, number release, messages, live call control, verifications and account transfers have external or retained effects. After an uncertain request, inspect the exact native resource and billing before retrying.
