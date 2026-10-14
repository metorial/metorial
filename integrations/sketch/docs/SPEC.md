# Sketch integration specification

## Supported surface

This integration processes unpacked Sketch JSON using the documented
[open file format](https://developer.sketch.com/file-format/). Sketch's developer
site also documents a Mac application JavaScript API and command-line tools;
this integration does not invoke those application runtimes.

Authentication and configuration are empty because all operations use the JSON
provided to the tool. There is no account identity to discover in this surface.
No remote account API or undocumented cloud endpoint is assumed.

## Document inspection

- `parse_document` summarizes pages, artboards, flattened child layers, local
  symbol sources, shared styles, color assets, and supplied version/font data.
- `inspect_layers` accepts at most one of `objectId`, `layerName`, or
  `layerClass`. Omitting all selectors lists child layers. Explicit selectors
  can match the page itself as well as its descendants.
- `extract_colors` reads legacy color assets, shared swatches, shared layer/text
  styles, enabled fills and borders, and attributed text colors. It deduplicates
  by color, source, and source name; it does not flatten gradients or render
  appearance/compositing.
- `extract_text_content` preserves empty text-layer strings and includes layer
  IDs, names, and containing page names.
- `extract_symbols` inventories local `symbolMaster` layers, exposing their
  symbol ID, object ID, name, page, and dimensions. It does not resolve remote
  libraries or expand symbol-instance overrides.

Nested JSON is checked for the fields used by these operations. Unknown fields
are retained. This structural check is not complete native schema validation.
Invalid consumed data and incompatible search selectors return clear validation
errors.

## Draft generation

`generate_page` and `generate_document` create partial draft JSON structures
and downloadable JSON files. Existing structured JSON output shapes are retained.
They do not generate a ZIP archive or certify that Sketch will open the drafts.
Layer-specific geometry, text attributes, images, complete style defaults, and
other required native fields may need completion for the target document version.

Hex colors accept 3, 4, 6, or 8 hexadecimal digits with an optional `#`; alpha
uses the final component. Invalid colors, negative dimensions or border
thickness, and opacity outside 0–1 are rejected. Generated text layers always
contain an attributed string, including empty strings.

Use the [official specification](https://developer.sketch.com/file-format/spec)
for version-specific validation. Its linked [schema repository](https://github.com/sketch-hq/sketch-document)
was archived in April 2025; documentation and historic schemas do not prove
compatibility with newer Sketch formats.
