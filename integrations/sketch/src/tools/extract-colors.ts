import { SlateTool } from 'slates';
import { z } from 'zod';
import { collectAllColors, type SketchDocumentJson, type SketchPage } from '../lib/client';
import { spec } from '../spec';

export let extractColorsTool = SlateTool.create(spec, {
  name: 'Extract Colors',
  key: 'extract_colors',
  description: `Extract all unique colors from a Sketch document. Collects colors from document color assets, shared layer styles, shared text styles, and individual layer fills and borders across all pages. Returns each color in both hex and rgba formats along with its source.

Use this to audit the color palette of a design, check for consistency, or export a design system's color tokens.`,
  instructions: [
    'Provide the pages array for layer-level color extraction.',
    'Optionally include documentJson to also capture document-level color assets and shared styles.'
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
        .describe('Contents of document.json from the .sketch archive')
    })
  )
  .output(
    z.object({
      colorCount: z.number().describe('Total number of unique color entries found'),
      colors: z
        .array(
          z.object({
            hex: z
              .string()
              .describe('Color in hex format (e.g. #FF5500 or #FF550080 with alpha)'),
            rgba: z.string().describe('Color in rgba format (e.g. rgba(255, 85, 0, 1))'),
            source: z
              .string()
              .describe(
                'Where this color was found: colorAsset, documentColor, sharedLayerStyle, sharedTextStyle, or layer'
              ),
            layerName: z
              .string()
              .optional()
              .describe('Name of the layer or style where this color was found')
          })
        )
        .describe('All extracted color entries')
    })
  )
  .handleInvocation(async ctx => {
    let pages = ctx.input.pages as SketchPage[];
    let documentJson = ctx.input.documentJson as SketchDocumentJson | undefined;

    let colors = collectAllColors(pages, documentJson);

    return {
      output: {
        colorCount: colors.length,
        colors
      },
      message: `Extracted **${colors.length}** unique color(s) from the document.`
    };
  })
  .build();
