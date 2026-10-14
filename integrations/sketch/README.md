# <img src="https://provider-logos.metorial-cdn.com/sketch.png" height="20"> Sketch

Inspect unpacked Sketch document JSON using the documented open file format.
Summarize pages and layers, search layers, extract colors and text, inventory
local reusable symbols, and generate downloadable draft JSON structures.
This integration processes supplied JSON without a Sketch account connection.

## Tools

| Tool | Purpose |
| --- | --- |
| Parse Document | Summarize pages, artboards, layers, local symbols, shared styles, fonts, and version metadata. |
| Inspect Layers | Find a layer by object ID, exact name, or class, or list all child layers. |
| Extract Colors | Collect color entries from color assets, shared swatches, shared styles, layer fills and borders, and text attributes. |
| Extract Text Content | Extract text and layer/page identifiers, including empty text layers. |
| Extract Symbols | Inventory local symbol sources with symbol IDs, object IDs, names, pages, and dimensions. |
| Generate Page | Produce a draft page JSON object and downloadable JSON file. |
| Generate Document | Produce draft document, metadata, user, and page JSON structures and downloadable JSON files. |

## Input and generation limits

Sketch documents are ZIP archives. Unpack a document and supply the JSON objects
from its `pages/` directory; `document.json` and `meta.json` enrich relevant
tools. The integration does not unzip archives, invoke the Mac app, render
designs, or retrieve remote library contents.

Generation produces partial draft structures, not certified native `.sketch`
files. Complete required layer and document fields and validate against the
[target official file-format specification](https://developer.sketch.com/file-format/spec)
before assembling an archive. Preserve any original version-specific fields
when modifying existing documents. The official linked schema repository is
archived, so it must not be assumed to describe every current Sketch release.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
