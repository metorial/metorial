# <img src="https://provider-logos.metorial-cdn.com/loom.png" height="20"> Loom

Record video messages capturing screen, camera, and microphone directly within web applications. Embed Loom video players by converting share URLs into rich embedded content. Retrieve video metadata including title, thumbnail, dimensions, and duration via the oembed method. Listen to client-side recording lifecycle events such as recording start, completion, and upload. Replace Loom links in text or DOM elements with embedded video players or GIF previews.

## Tools

### Generate Embed Code

Generate an embeddable iframe HTML snippet or embed URL for a Loom video. Supports customization such as fixed or responsive dimensions, autoplay, hiding the top bar, and setting a start time. Use this when you need to embed a Loom video into a webpage or application.

### Get Video Metadata

Retrieve metadata for a Loom video using its share or embed URL. Returns the video title, thumbnail, dimensions, duration, and embed HTML via Loom's oEmbed endpoint. Useful for previewing video information, generating thumbnails, or building custom video galleries.

### Replace Loom URLs

Find all Loom video URLs in a block of text and replace them with embedded video player HTML. Scans for Loom share and embed URLs, fetches their oEmbed data, and substitutes each URL with the corresponding embed HTML. Useful for processing user-generated content, messages, or documents that contain Loom links.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
