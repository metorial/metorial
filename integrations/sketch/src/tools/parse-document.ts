import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  collectAllSymbols,
  findLayersByClass,
  flattenLayers,
  type SketchDocumentJson,
  type SketchMetaJson,
  type SketchPage
} from '../lib/client';
import { spec } from '../spec';

export let parseDocumentTool = SlateTool.create(spec, {
  name: 'Parse Document',
  key: 'parse_document',
  description: `Parse Sketch document JSON data and return a structured overview of the document contents. Accepts the raw JSON from a Sketch file's **document.json**, **meta.json**, and **page JSON** files, and returns a summary including pages, artboards, layer counts, symbols, shared styles, fonts, and version info.

Use this to quickly understand the structure and contents of a Sketch document without manually inspecting the raw JSON.`,
  instructions: [
    'Provide at minimum the pages array. For a richer summary, also include the documentJson and metaJson fields.',
    'Page JSON objects are found inside the pages/ folder of a .sketch ZIP archive.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pages: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of page JSON objects from the pages/ folder in the .sketch archive'),
      documentJson: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Contents of document.json from the .sketch archive'),
      metaJson: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Contents of meta.json from the .sketch archive')
    })
  )
  .output(
    z.object({
      sketchVersion: z
        .string()
        .optional()
        .describe('Sketch app version that created the document'),
      formatVersion: z.number().optional().describe('File format version number'),
      fonts: z.array(z.string()).optional().describe('Fonts used in the document'),
      pageCount: z.number().describe('Total number of pages'),
      totalArtboardCount: z.number().describe('Total number of artboards across all pages'),
      totalLayerCount: z
        .number()
        .describe('Total number of layers (all types, flattened) across all pages'),
      totalSymbolMasterCount: z.number().describe('Total number of symbol masters'),
      sharedLayerStyleCount: z.number().describe('Number of shared layer styles'),
      sharedTextStyleCount: z.number().describe('Number of shared text styles'),
      colorAssetCount: z.number().describe('Number of color assets defined in the document'),
      pages: z
        .array(
          z.object({
            pageObjectId: z.string().describe('Unique object ID of the page'),
            pageName: z.string().describe('Name of the page'),
            artboardCount: z.number().describe('Number of artboards on this page'),
            layerCount: z.number().describe('Total flattened layer count on this page'),
            artboards: z
              .array(
                z.object({
                  artboardObjectId: z.string().describe('Unique object ID of the artboard'),
                  artboardName: z.string().describe('Name of the artboard'),
                  width: z.number().describe('Width of the artboard in points'),
                  height: z.number().describe('Height of the artboard in points'),
                  layerCount: z.number().describe('Number of direct child layers')
                })
              )
              .describe('Artboards on this page')
          })
        )
        .describe('Per-page summary'),
      symbols: z
        .array(
          z.object({
            symbolId: z.string().describe('Symbol ID used for referencing'),
            objectId: z.string().describe('Unique object ID of the symbol master'),
            symbolName: z.string().describe('Name of the symbol'),
            pageName: z.string().describe('Page where the symbol master lives')
          })
        )
        .describe('Symbol masters found in the document')
    })
  )
  .handleInvocation(async ctx => {
    let pages = ctx.input.pages as SketchPage[];
    let documentJson = ctx.input.documentJson as SketchDocumentJson | undefined;
    let metaJson = ctx.input.metaJson as SketchMetaJson | undefined;

    let pagesSummary = pages.map(page => {
      let artboards = findLayersByClass(page.layers ?? [], 'artboard');
      let allLayers = flattenLayers(page.layers ?? []);
      return {
        pageObjectId: page.do_objectID,
        pageName: page.name,
        artboardCount: artboards.length,
        layerCount: allLayers.length,
        artboards: artboards.map(ab => ({
          artboardObjectId: ab.do_objectID,
          artboardName: ab.name,
          width: ab.frame?.width ?? 0,
          height: ab.frame?.height ?? 0,
          layerCount: ab.layers?.length ?? 0
        }))
      };
    });

    let totalArtboardCount = pagesSummary.reduce((sum, p) => sum + p.artboardCount, 0);
    let totalLayerCount = pagesSummary.reduce((sum, p) => sum + p.layerCount, 0);

    let symbols = collectAllSymbols(pages);
    let totalSymbolMasterCount = symbols.length;

    let sharedLayerStyleCount = documentJson?.layerStyles?.objects?.length ?? 0;
    let sharedTextStyleCount = documentJson?.layerTextStyles?.objects?.length ?? 0;
    let colorAssetCount = documentJson?.assets?.colorAssets?.length ?? 0;

    let output = {
      sketchVersion: metaJson?.appVersion,
      formatVersion: metaJson?.version,
      fonts: metaJson?.fonts,
      pageCount: pages.length,
      totalArtboardCount,
      totalLayerCount,
      totalSymbolMasterCount,
      sharedLayerStyleCount,
      sharedTextStyleCount,
      colorAssetCount,
      pages: pagesSummary,
      symbols: symbols.map(s => ({
        symbolId: s.symbolId,
        objectId: s.objectId,
        symbolName: s.name,
        pageName: s.pageName
      }))
    };

    return {
      output,
      message: `Parsed Sketch document with **${pages.length}** page(s), **${totalArtboardCount}** artboard(s), **${totalLayerCount}** total layer(s), and **${totalSymbolMasterCount}** symbol master(s).`
    };
  })
  .build();
