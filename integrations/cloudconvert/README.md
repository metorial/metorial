# CloudConvert

Convert, optimize, watermark, and process files using CloudConvert API v2. The 17 tools support URL-based processing, website capture, thumbnails, PDF merging, metadata extraction, archives, seven PDF operations, custom job graphs, account details, job and task inspection, explicit task lifecycle actions, job deletion, and downloads of existing results.

Connect with an API key or OAuth and select production or sandbox. Sandbox processing requires CloudConvert's whitelisted files. Processing and explicit retries can consume credits in production; cancellation and deletion do not refund consumed credits.

Jobs remain asynchronous unless bounded waiting is requested. A timeout preserves the job ID so the same job can be inspected again. Finished export files are downloadable up to 32 MiB each, with at most 20 files per call. Use `download_job_files` with a file index for larger collections. Provider job data and temporary exports normally expire after 24 hours; an expired export cannot be renewed by these tools.

Operation options and supported formats depend on the selected CloudConvert engine. Use `list_formats` to inspect the current conversion catalog and [CloudConvert's documentation](https://cloudconvert.com/docs/getting-started/introduction) for operation-specific options.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
