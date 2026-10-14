# <img src="logo.svg" height="20"> Gamma

Generate AI-powered presentations, documents, social media posts, and webpages from text prompts or existing templates. Control text handling modes (generate, condense, preserve), configure image sourcing (AI-generated, stock photos, GIFs, web images), and apply visual themes for colors and fonts. Export generated content as PDF, PPTX, or PNG ZIP files. Share content with configurable access permissions and organize it into folders. Supports 60+ languages, customizable tone, audience targeting, card dimensions, and header/footer configuration.

## Tools

Generate content from text or an existing workspace template, poll generation status, list themes and folders, search documents and templates, and retrieve document metadata. Use `search_templates` to discover workspace template file IDs before calling `generate_from_template`; official explore template IDs are not eligible.

API key access requires a Pro, Ultra, Teams, or Business plan. Generation consumes credits. Exports become downloadable when generation completes, and their provider links expire after approximately one week. Treat the legacy `exportUrl` result as a secret and download promptly.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
