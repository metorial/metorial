# PostGrid Integration Specification

PostGrid provides Print & Mail and Address Verification APIs. Requests use an `x-api-key` header. Print & Mail keys and Address Verification keys are separate; an optional Address Verification key can be supplied alongside the primary key. Existing connections continue to use their primary key for address requests when no separate key is supplied.

## Supported tools

- Contacts: `create_contact`, `list_contacts`, `get_contact`.
- Templates: `create_template`, `list_templates`, `update_template`.
- Mail: `send_letter`, `send_postcard`, `send_cheque`, `send_self_mailer`, `list_orders`, `get_order`, `cancel_order`.
- Addresses: `verify_address`, `verify_international_address`, `autocomplete_address`, `autocomplete_international_address`.

Print & Mail requests use `https://api.postgrid.com/print-mail/v1`. Inline contacts must have a first name or company name. The existing `country` tool input maps to the provider's `countryCode` field. List endpoints accept `skip`, `limit`, and `search`; whole-number pagination is validated without changing existing numeric input types. Template updates use `POST /templates/{id}`.

Domestic address requests use `https://api.postgrid.com/v1/addver`; international requests use `https://api.postgrid.com/v1/intl_addver`. Verification accepts exactly one freeform or structured address. Domestic autocomplete unwraps each result's `preview` object. International verification returns the provider's verification status when the standard status field is absent.

Mail preview PDFs are supplied as downloadable files when the provider returns a preview URL. Existing preview URL output fields remain available. Signed URLs are renewed through normal order retrieval before their embedded expiry; URLs without an embedded expiry are renewed on the next download. Rendering may still be pending when an order is created.

Cheques require a bank account configured in PostGrid. Amounts are positive whole numbers of cents. Preview rendering, cancellation eligibility, mailing classes, and available order options are enforced by PostGrid.

Legacy self-mailer `templateId` and `html` fields are preserved for compatibility; current provider documentation describes separate inside/outside HTML or templates, or a two-page PDF. Prefer those documented content fields.

## Provider references

- [Print & Mail API](https://docs.postgrid.com/)
- [Contacts](https://guides.postgrid.com/api/resources/print_mail/subresources/contacts/)
- [Templates](https://guides.postgrid.com/api/resources/print_mail/subresources/templates/)
- [Letters](https://guides.postgrid.com/api/resources/print_mail/subresources/letters/)
- [Self-mailers](https://guides.postgrid.com/api/resources/print_mail/subresources/self_mailers/)
- [Cheques](https://guides.postgrid.com/api/resources/print_mail/subresources/cheques/)
- [Address Verification](https://guides.postgrid.com/api/resources/addressVerification/)
- [International Address Verification](https://guides.postgrid.com/api/resources/intlAddressVerification/)
