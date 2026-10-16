# <img src="logo.svg" height="20"> ShortPixel

Compress, resize, and convert images and PDFs to reduce file sizes. Optimize images via publicly accessible URLs with lossy, glossy, or lossless compression. Convert images to next-gen formats like WebP and AVIF. Resize and smart-crop images, upscale images by 2x-4x, and remove or replace image backgrounds. Deliver optimized images on-the-fly via CDN with adaptive parameters. Manage account domains, check CDN usage statistics, and monitor available API credits.

Choose `optimize_image_file` when starting a single-image workflow that needs image content in one synchronous request; do not run it after batch optimization as a download step because it starts separate processing. It returns only the actual MIME type and byte size as metadata. The existing `optimize_image` batch tool returns its original provider URLs only; download those promptly because ShortPixel retains optimized files for approximately two hours. Credit usage reflects provider values, including numeric counters returned as strings. Register a new domain with `manage_domain` action `add`; `associate` links an existing domain.

API reference: [image optimization](https://shortpixel.com/api-docs), [CDN domains and credits](https://shortpixel.com/knowledge-base/article/shortpixels-cdn-api-endpoints/), and [adaptive images](https://shortpixel.com/adaptive-images-api).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
