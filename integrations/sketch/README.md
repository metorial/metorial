# <img src="https://provider-logos.metorial-cdn.com/sketch.png" height="20"> Sketch

Manipulate Sketch design documents programmatically via a local JavaScript Plugin API, CLI tool (sketchtool), and open JSON-based file format. Create, read, and modify documents including layers, symbols, colors, and styles. Export artboards, layers, slices, and pages in multiple formats (PNG, JPG, SVG, PDF). Inspect document metadata and dump full document structure as JSON. Import symbols and styles from shared libraries. Generate or process Sketch files server-side without the app by reading/writing the open ZIP/JSON file format. Supply custom data (images, text) to Sketch via Data Suppliers. Note: all APIs are local to macOS or file-based — there is no public remote/cloud API, no webhooks, and no OAuth or API key authentication.

## Tools

### Extract Colors

Extract all unique colors from a Sketch document. Collects colors from document color assets, shared layer styles, shared text styles, and individual layer fills and borders across all pages. Returns each color in both hex and rgba formats along with its source. Use this to audit the color palette of a design, check for consistency, or export a design system's color tokens.

### Extract Text Content

Extract all text content from text layers in a Sketch document. Returns the string content of every text layer along with the layer name and page it belongs to. Use this for content auditing, localization workflows, copy extraction, or checking text across a design for consistency or typos.

### Generate Document

Generate a complete Sketch document structure including **document.json**, **meta.json**, and **page JSON** files. Creates valid Sketch file format data that can be assembled into a .sketch ZIP archive. Use this to programmatically create entire Sketch documents with pages, artboards, layers, color assets, and shared styles.

### Generate Page

Generate a Sketch page JSON structure with artboards and layers. Creates valid Sketch file format JSON that can be included in a .sketch archive. Use this to programmatically create page content for Sketch documents, including artboards sized for common device screens and layers with fills, borders, and text.

### Inspect Layers

Search and inspect layers within Sketch page JSON data. Find layers by **object ID**, **name**, or **layer class** (e.g. artboard, text, symbolMaster, group, rectangle). Returns a summarized view of matching layers including their type, position, dimensions, visibility, and relevant metadata. Use this to drill into specific layers or find all layers of a certain type across pages.

### Parse Document

Parse Sketch document JSON data and return a structured overview of the document contents. Accepts the raw JSON from a Sketch file's **document.json**, **meta.json**, and **page JSON** files, and returns a summary including pages, artboards, layer counts, symbols, shared styles, fonts, and version info. Use this to quickly understand the structure and contents of a Sketch document without manually inspecting the raw JSON.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
