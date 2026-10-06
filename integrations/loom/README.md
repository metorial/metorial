# <img src="https://provider-logos.metorial-cdn.com/loom.png" height="20"> Loom

Read metadata for a shareable Loom video, generate embed HTML or a player URL, and replace Loom URLs in text with native embeds. No credentials are required for anonymous oEmbed. Video privacy still controls metadata availability and playback; generating HTML does not verify permission or video existence.

This integration does not record, upload, play, modify, download or delete videos. Loom's recording SDK and the separately authenticated Atlassian Loom MCP tools are outside its scope. See the [capability specification](docs/SPEC.md) for native contracts and compatibility limits.

## Tools

### Generate Embed Code

Generate an embeddable iframe HTML snippet or embed URL for a Loom video. Supports customization such as fixed or responsive dimensions, autoplay, hiding the top bar, and setting a start time. Use this when you need to embed a Loom video into a webpage or application.

### Get Video Metadata

Retrieve metadata for a Loom video using its share or embed URL. Returns the video title, thumbnail, dimensions, duration, and embed HTML via Loom's oEmbed endpoint. Useful for previewing video information, generating thumbnails, or building custom video galleries.

### Replace Loom URLs

Find all Loom video URLs in a block of text and replace them with embedded video player HTML. Scans for Loom share and embed URLs, fetches their oEmbed data, and substitutes each URL with the corresponding embed HTML. Useful for processing user-generated content, messages, or documents that contain Loom links.

Each unique valid URL is read once; unavailable URLs remain unchanged with an explicit failure receipt. Replacement counts distinguish unique URLs from repeated occurrences. Other text is preserved, not sanitized. Local bounds are 1 MiB input, 20 unique URLs and 2 MiB output. Reads can leave provider access logs even when replacement fails.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
