# FlexiSign integration specification

## Authentication

Use a workspace API key generated in FlexiSign. Requests target
`https://api.flexisign.io/v1` and send the key in the `api-key` header. No OAuth
scopes or workspace configuration are required.

## Template workflow

- `list_templates` calls `GET /templates/all`. FlexiSign returns templates in
  `data.list` with `_id` and `name`; the tool exposes those values as `templateId`
  and `templateName`.
- `get_template` calls `GET /template?templateId=...`. FlexiSign returns
  `data.template` with its ID, name, recipient roles, and `bodyStructure`. The
  tool exposes normalized ID and name fields, the body structure, and recipient
  details when supplied.
- `send_document` calls `POST /template/create-document`. Its body contains the
  selected `templateId` and the caller's template fields. Typical fields are
  `en_message`, `recipient_0_email`, `recipient_0_name`, and `expiresIn`; inspect
  the selected template to discover the exact field names. A conflicting
  `templateFields.templateId` is rejected before sending. The provider response
  is preserved in the `response` output.

Create templates in the FlexiSign application before using these tools. The
published API describes template listing, template details, and document
creation; it does not document an account identity or document-status endpoint.

## Source

[Official FlexiSign eSignature API documentation](https://flexisign.io/esignature-api)
