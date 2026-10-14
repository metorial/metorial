# HelloLeads integration

## Tools

- `get_leads`: retrieve a page of leads with contact information and qualifiers.
- `create_lead`: create a lead using a first name and either an email address or a mobile number. The optional list key comes from `get_lists`.
- `get_lists`: retrieve available lead lists and their identifiers.

## Authentication

The integration retains API key and account email authentication. Existing requests use the `hls-key` header with `token=<API_KEY>` and the `Xemail` header with the account email address. API requests use the existing `https://app.helloleads.io/index.php/private/api` base URL.

## Request and response behavior

Lead retrieval retains `GET /leads` with `page` and `limit`; the defaults remain page 1 and 100 leads. Pagination values are validated as whole numbers at runtime while the public fields retain their existing number schemas.

Lead creation retains `POST /leads` and the existing field mapping. A nonblank first name and either email or mobile are required. Optional fields retain the existing omission behavior for undefined or empty-string values. List retrieval retains `GET /lists`.

Responses support the existing direct-array, `data`, and `leads`/`lists` collection formats, and direct-object, `data`, or `lead` creation formats. Invalid collection shapes and missing identifiers produce an explicit error instead of empty success results. Numeric values in existing string output fields are converted to strings, including a zero deal size.

## Documentation and verification limits

[HelloLeads FAQ](https://helloleads.io/faq/) directs users to the signed-in web app for API and website integration details. The public [Wix integration guide](https://helloleads.io/learnmore-android/en/wix/) documents a separate form-integration URL and directs users to a PDF inside the signed-in app for its complete field reference. Those public pages do not verify the existing private API endpoint contracts or response envelopes.

The existing private API behavior is preserved pending access to the account-specific reference. No new endpoints, identity tool, file export, or webhook behavior are claimed. Additional tools require a documented API contract. Local builds and static checks do not establish live provider acceptance.
