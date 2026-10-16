# AlgoDocs

Connect with an API key, optionally using the registered email address for Basic authentication. Credentials come from the account's REST API settings.

## Tools

| Tool | Outcome |
| --- | --- |
| `get_current_user` | Connected account name and email |
| `list_extractors` | Extractor identifiers, names, and original metadata |
| `list_folders` | Folder identifiers, hierarchy, names, and original metadata |
| `upload_document` | Submit a URL or base64 document using form data |
| `get_extracted_data` | Retrieve document or extractor results and original records |
| `download_document` | Download the original or Excel, JSON, XML, TXT, or CSV output |

Use discovery tools before uploading. Processing is asynchronous: poll extracted data until ready. Extractor queries accept `folderId`, `date`, and a positive whole-number `limit`. The date string is forwarded unchanged. No cursor or offset is documented.

Classifier failures remain visible in the original `data` object. `extractorId` and `pageNumber` are returned only when present. Download links come from extraction results; no expiry is assumed.

[Official API reference](https://api.algodocs.com/) documents authentication, endpoint contracts, response samples, and supported formats. Dashboard-only workflows are outside this API surface.
