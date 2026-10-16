# Linguapop integration

## Authentication

Connect with an API key from an active integration in the Linguapop dashboard.
Organization admins manage these keys. Refreshing a key invalidates its previous
value; archived integrations cannot authenticate.

## Tools

- `get_languages` retrieves language names and codes from `GET /getLanguages`.
- `send_test_invitation` uses `POST /sendInvitation`. Its existing candidate,
  language, external ID, kiosk, and skill-section inputs map to the API's field
  names. Omitted `sendEmail` means false. The response confirms email delivery
  independently of the requested value.

The existing `invitationId` output remains a string; the provider's numeric ID
is retained in `raw`. The `testUrl` output maps to the provider's `url`.
Nullable `kioskCode` and `externalIdentifier` are omitted from their optional
string outputs when null, while `raw` retains the full response including nulls.

External identifiers allow 500 characters; callback and return URLs allow 1000.
Reading/listening options inherit account customization when omitted. A return
URL is opened by a button on the completed test's results page.

## Capability limits

Results are delivered to a caller-supplied `callbackUrl`; this integration does
not register a native completion trigger. The public API reference documents no
identity, invitation-list, result-fetch, update, or deletion endpoint.

## Official references

- [API](https://docs.linguapop.eu/api/)
- [Integration keys](https://docs.linguapop.eu/integrations/)
