# CloudConvert integration

The integration exposes 17 tools for CloudConvert API v2. Authentication uses a Bearer API key or the OAuth authorization-code flow with `user.read`, `task.read`, and `task.write`. API keys have no invented expiry. The connection selects production or sandbox; previously saved environment configuration remains supported.

| Tool | Capability |
| --- | --- |
| `convert_file` | Convert a URL-based source using current operation options. |
| `optimize_file` | Optimize a supported file without changing its format. |
| `add_watermark` | Add text or an imported image using native watermark position and opacity fields. |
| `capture_website` | Capture a website with provider-dependent engine options. |
| `generate_thumbnail` | Generate a thumbnail with provider-dependent engine options. |
| `merge_files` | Merge sources into PDF. |
| `extract_metadata` | Create a metadata task and return actual metadata. |
| `create_archive` | Archive multiple URL-based sources. |
| `process_pdf` | OCR, encrypt, decrypt, split, extract, rotate, or create PDF/A with the corresponding native PDF operation. |
| `create_job` | Submit an explicit named task graph with validated dependencies and an optional recovery tag. |
| `get_job` | Inspect an exact job and download its completed export results. |
| `list_jobs` | List one native page, preserving current and next-page state. |
| `list_formats` | Read the current conversion catalog from `/operations`. |
| `get_current_user` | Read the connected account, exact user ID, and available credits. |
| `manage_task` | Get, list, explicitly cancel, retry, or delete tasks. |
| `delete_job` | Delete an exact job and confirm that it is no longer readable. |
| `download_job_files` | Download completed files from an existing job without creating a new job or export. |

Production requests use `https://api.cloudconvert.com/v2`; sandbox requests use `https://api.sandbox.cloudconvert.com/v2`. Production waiting uses the documented synchronous job endpoint. Sandbox waiting polls the documented job endpoint for at most 60 seconds. Waiting does not create another job or automatically retry a task. Unknown or malformed completion states fail with recovery guidance tied to the existing ID.

Job listing uses native `page`, `per_page`, `meta.current_page`, and `links.next`. The legacy `waiting` job filter is retained in the input contract but refused because the current job-list API does not document that filter. Task listing supports the documented task statuses. Missing provider counts, dates, metadata, and credits remain absent rather than becoming fabricated values.

Explicit retry creates a new task ID and can consume credits. Cancellation is restricted to waiting or processing tasks. Task and job deletion require the documented 204 response followed by an independent 404 read. Deletion removes provider task/job data and does not imply a credit refund or erasure of usage history.

Completed `export/url` files are delivered as downloadable files, never inline file contents. Downloads are bounded to 32 MiB per file and 20 files per call, with an optional zero-based file index for larger collections. Temporary exports normally expire after 24 hours. There is no documented renewal operation in this integration. Only CloudConvert storage URLs are accepted; redirects, unexpected file responses, credential reflection, and oversized results fail safely.

No triggers or webhook registration tools are exposed. `create_job` retains the documented inline `webhook_url` option; the supported inline notifications are job finished and job failed.

## Official references

- [Authentication and sandbox](https://cloudconvert.com/docs/getting-started/introduction)
- [Jobs](https://cloudconvert.com/docs/api-reference/jobs), [tasks](https://cloudconvert.com/docs/api-reference/tasks), [users](https://cloudconvert.com/docs/api-reference/users), and [operation catalog](https://cloudconvert.com/docs/api-reference/operations)
- [Conversion](https://cloudconvert.com/docs/operations/convert-files), [optimization](https://cloudconvert.com/docs/operations/optimize-files), [watermarks](https://cloudconvert.com/docs/operations/add-watermarks), [website capture](https://cloudconvert.com/docs/operations/capture-website), and [thumbnails](https://cloudconvert.com/docs/operations/create-thumbnails)
- [Merging](https://cloudconvert.com/docs/operations/merge-files), [metadata](https://cloudconvert.com/docs/operations/file-metadata), [archives](https://cloudconvert.com/docs/operations/create-archives), and [PDF operations](https://cloudconvert.com/docs/operations/pdf-operations)
- [Imports](https://cloudconvert.com/docs/import-export/import-files) and [exports](https://cloudconvert.com/docs/import-export/export-files)
