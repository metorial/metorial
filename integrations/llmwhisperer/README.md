# LLMWhisperer

Extract and convert complex documents — PDFs, scanned images, Office documents, and spreadsheets — into LLM-optimized text. Submit documents by URL with multiple extraction modes: native text, low-cost OCR, high-quality OCR, form extraction, and table extraction. Preserve document layout or extract plain text. Configure image preprocessing (median filter, Gaussian blur) to improve OCR quality. Select specific pages for extraction. Check extraction status for async processing and retrieve results when ready. Get line-level bounding box metadata for text highlighting and search. Register webhooks for extraction completion notifications. Track API usage metrics by processing mode and tag.

Use `get_extraction_details` to inspect page counts, processing times, and source file size. Use `get_tag_usage` to report usage by extraction mode for a tag and date range. Retrieval is a one-time operation in the cloud API; save the returned text for later use.

See the [API specification](docs/SPEC.md) for authentication, regional endpoints, and official reference links.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
