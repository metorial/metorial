# ConvertAPI capabilities

| Tools | Native capability |
| --- | --- |
| `convert_file`, `convert_file_async`, `get_async_job_result` | JSON conversion parameters, asynchronous submission and exact job polling |
| `merge_pdf`, `split_pdf`, `compress_pdf` | Ordered PDF merge, page-count split, default compression |
| `protect_pdf`, `decrypt_pdf` | AES-256 protection with print/copy options, password-based unprotection |
| `extract_text`, `watermark_pdf`, `pdf_to_pdfa` | Downloadable text with PDF OCR options, text watermark, provider-default PDF/A-2b |
| `list_supported_conversions` | Full, source, destination and pair discovery; optional native parameters and route names |
| `get_account_info` | Master Token account identity and native usage counters; accepted legacy credentials remain compatible |
| `upload_file`, `download_file`, `delete_file` | URL upload, exact temporary download and verified removal |
| `delete_async_job` | Exact job retention cleanup with absence verification; no cancellation or refund claim |

Authentication, expiry, compatibility and retained effects are described in [README.md](./README.md). No administration, callbacks, replacement triggers, token generation or unrelated converters were added.

Official API references checked during implementation:

- [Authentication](https://www.convertapi.com/docs/authentication), [account information](https://www.convertapi.com/docs/user-information), [response codes](https://www.convertapi.com/docs/response-codes).
- [JSON file parameters and results](https://www.convertapi.com/docs/content-types), [temporary files](https://www.convertapi.com/docs/file-upload), [asynchronous jobs](https://www.convertapi.com/docs/async-conversions).
- [Converter discovery](https://www.convertapi.com/docs/converter-information), [OpenAPI schemas](https://www.convertapi.com/docs/openapi-schema), [regional servers](https://www.convertapi.com/docs/servers-location).
- [Merge](https://www.convertapi.com/pdf-to-merge), [split](https://www.convertapi.com/pdf-to-split), [compress](https://www.convertapi.com/pdf-to-compress), [protect](https://www.convertapi.com/pdf-to-protect), [unprotect](https://www.convertapi.com/pdf-to-unprotect), [text](https://www.convertapi.com/pdf-to-txt), [text watermark](https://www.convertapi.com/pdf-to-text-watermark), [PDF/A](https://www.convertapi.com/pdf-to-pdfa).
- [Current PDF converter schema](https://v2.convertapi.com/info/openapi/pdf/to/*) and [current PDF converter metadata](https://v2.convertapi.com/info/pdf/to/*) supplied exact routes, types and parameter requirements. These are public metadata reads, not file conversions.
