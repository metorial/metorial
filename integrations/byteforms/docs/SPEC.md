# ByteForms API specification

## Authentication

Create an API key on the ByteForms account page. Requests use the base URL
`https://api.forms.bytesuite.io/api` and the `Authorization` header containing
the API key without a `Bearer` prefix.

The [official API documentation](https://forms.bytesuite.io/docs/api#authentication)
describes this authentication method. No OAuth scopes are required.

## Available operations

The [endpoint reference](https://forms.bytesuite.io/docs/api#endpoints) documents:

| Tool | Request | Result |
| --- | --- | --- |
| `list_forms` | `GET /form` | All forms created by the authenticated user |
| `get_form` | `GET /form/{formId}` | One form and its configuration |
| `list_form_submissions` | `GET /form/responses/{formId}` | A page of submissions with a count and cursors |

Call `list_forms` to discover a form ID. Submission requests support `limit`,
`order` (`asc` or `desc`), `query`, `after`, and `before`. Pass the returned
`after` or `before` cursor to retrieve another page. A supplied limit must be a
positive whole number; the reference does not document a maximum or default.

## Returned data

The [model reference](https://forms.bytesuite.io/docs/api#models) defines numeric
form and submission IDs, field definitions, page configuration, owner IDs,
creation/update timestamps, and nullable deletion timestamps. Form options
include submission limits and deadlines, confirmation messages, layout,
visibility, and notification settings.

Submission responses preserve the provider's field values, including nested
objects used by file, ReCaptcha, and Calendly fields. The IP address is returned
when the provider supplies it as a string.

## Errors

ByteForms documents API failures as an object containing `message` and
`status: "fail"`. HTTP failures, unsuccessful response envelopes, and malformed
collection responses produce a structured service error. Empty credentials and
form IDs are rejected before sending a request.
