import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  createArtboard,
  createDocumentJson,
  createLayer,
  createMetaJson,
  createPage,
  createStyle,
  generateObjectId,
  hexToColor,
  type SketchLayer,
  type SketchLayerClass,
  type SketchPage,
  type SketchSharedStyle
} from '../lib/client';
import { spec } from '../spec';

let layerInputSchema: z.ZodType<{
  name: string;
  layerClass: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fillColor?: string;
  borderColor?: string;
  borderThickness?: number;
  opacity?: number;
  isVisible?: boolean;
  textContent?: string;
  children?: unknown[];
}> = z.object({
  name: z.string().describe('Name of the layer'),
  layerClass: z
    .enum([
      'rectangle',
      'oval',
      'text',
      'group',
      'shapePath',
      'shapeGroup',
      'star',
      'polygon',
      'triangle',
      'bitmap',
      'slice'
    ])
    .describe('Type of layer to create'),
  x: z.number().optional().describe('X position (default: 0)'),
  y: z.number().optional().describe('Y position (default: 0)'),
  width: z.number().optional().describe('Width in points (default: 100)'),
  height: z.number().optional().describe('Height in points (default: 100)'),
  fillColor: z.string().optional().describe('Fill color as hex string (e.g. "#FF5500")'),
  borderColor: z.string().optional().describe('Border color as hex string'),
  borderThickness: z.number().optional().describe('Border thickness in points'),
  opacity: z.number().optional().describe('Layer opacity (0.0 to 1.0)'),
  isVisible: z.boolean().optional().describe('Whether the layer is visible (default: true)'),
  textContent: z.string().optional().describe('Text content (only for text layers)'),
  children: z
    .array(z.lazy(() => layerInputSchema))
    .optional()
    .describe('Child layers (for group layers)')
});

let artboardInputSchema = z.object({
  name: z.string().describe('Name of the artboard'),
  x: z.number().optional().describe('X position (default: 0)'),
  y: z.number().optional().describe('Y position (default: 0)'),
  width: z.number().optional().describe('Width in points (default: 375)'),
  height: z.number().optional().describe('Height in points (default: 812)'),
  layers: z.array(layerInputSchema).optional().describe('Layers to add to the artboard')
});

let pageInputSchema = z.object({
  pageName: z.string().describe('Name of the page'),
  artboards: z.array(artboardInputSchema).optional().describe('Artboards to place on the page')
});

let colorAssetInputSchema = z.object({
  name: z.string().optional().describe('Name of the color asset'),
  hex: z.string().describe('Color in hex format (e.g. "#FF5500")')
});

let sharedStyleInputSchema = z.object({
  name: z.string().describe('Name of the shared style'),
  fillColor: z.string().optional().describe('Fill color as hex string'),
  borderColor: z.string().optional().describe('Border color as hex string'),
  borderThickness: z.number().optional().describe('Border thickness in points'),
  opacity: z.number().optional().describe('Opacity (0.0 to 1.0)')
});

let buildLayer = (input: z.infer<typeof layerInputSchema>): SketchLayer => {
  let style = createStyle({
    fillColor: input.fillColor ? hexToColor(input.fillColor) : undefined,
    borderColor: input.borderColor ? hexToColor(input.borderColor) : undefined,
    borderThickness: input.borderThickness,
    opacity: input.opacity
  });

  let children: SketchLayer[] | undefined;
  if (input.children && input.children.length > 0) {
    children = (input.children as z.infer<typeof layerInputSchema>[]).map(buildLayer);
  }

  let layer = createLayer({
    layerClass: input.layerClass as SketchLayerClass,
    name: input.name,
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    style,
    layers: children,
    isVisible: input.isVisible
  });

  if (input.layerClass === 'text' && input.textContent) {
    layer.attributedString = {
      _class: 'attributedString',
      string: input.textContent,
      attributes: []
    };
  }

  return layer;
};

export let generateDocumentTool = SlateTool.create(spec, {
  name: 'Generate Document',
  key: 'generate_document',
  description: `Generate a complete Sketch document structure including **document.json**, **meta.json**, and **page JSON** files. Creates valid Sketch file format data that can be assembled into a .sketch ZIP archive.

Use this to programmatically create entire Sketch documents with pages, artboards, layers, color assets, and shared styles.`,
  instructions: [
    'The output includes all the JSON structures needed for a .sketch file: document.json, meta.json, user.json, and individual page JSON files.',
    'To assemble a valid .sketch file, place document.json, meta.json, and user.json at the root of a ZIP archive, and put each page JSON in the pages/ folder using the page object ID as the filename.'
  ]
})
  .input(
    z.object({
      pages: z
        .array(pageInputSchema)
        .min(1)
        .describe('Pages to include in the document (at least one required)'),
      colorAssets: z
        .array(colorAssetInputSchema)
        .optional()
        .describe('Document-level color assets'),
      sharedLayerStyles: z
        .array(sharedStyleInputSchema)
        .optional()
        .describe('Shared layer styles'),
      sharedTextStyles: z
        .array(sharedStyleInputSchema)
        .optional()
        .describe('Shared text styles')
    })
  )
  .output(
    z.object({
      documentJson: z
        .record(z.string(), z.unknown())
        .describe('The document.json content for the .sketch archive root'),
      metaJson: z
        .record(z.string(), z.unknown())
        .describe('The meta.json content for the .sketch archive root'),
      userJson: z
        .record(z.string(), z.unknown())
        .describe('The user.json content for the .sketch archive root'),
      pages: z
        .array(
          z.object({
            filename: z
              .string()
              .describe('Filename to use in the pages/ folder (e.g. "pages/{objectId}.json")'),
            pageJson: z.record(z.string(), z.unknown()).describe('The page JSON content')
          })
        )
        .describe('Page JSON files to place in the pages/ folder')
    })
  )
  .handleInvocation(async ctx => {
    let builtPages: SketchPage[] = ctx.input.pages.map(pageInput => {
      let artboardLayers: SketchLayer[] = (pageInput.artboards ?? []).map(ab => {
        let childLayers = (ab.layers ?? []).map(buildLayer);
        return createArtboard({
          name: ab.name,
          x: ab.x,
          y: ab.y,
          width: ab.width,
          height: ab.height,
          layers: childLayers
        });
      });

      return createPage({
        name: pageInput.pageName,
        layers: artboardLayers
      });
    });

    let colorAssets = ctx.input.colorAssets?.map(ca => ({
      name: ca.name,
      color: hexToColor(ca.hex)
    }));

    let buildSharedStyle = (
      input: z.infer<typeof sharedStyleInputSchema>
    ): SketchSharedStyle => ({
      _class: 'sharedStyle',
      do_objectID: generateObjectId(),
      name: input.name,
      value: createStyle({
        fillColor: input.fillColor ? hexToColor(input.fillColor) : undefined,
        borderColor: input.borderColor ? hexToColor(input.borderColor) : undefined,
        borderThickness: input.borderThickness,
        opacity: input.opacity
      })
    });

    let sharedStyles = ctx.input.sharedLayerStyles?.map(buildSharedStyle);
    let sharedTextStyles = ctx.input.sharedTextStyles?.map(buildSharedStyle);

    let documentJson = createDocumentJson({
      pages: builtPages,
      sharedStyles,
      sharedTextStyles,
      colorAssets
    });

    let metaJson = createMetaJson({ pages: builtPages });

    let userJson: Record<string, unknown> = {
      document: {
        pageListHeight: 110,
        pageListCollapsed: 0
      }
    };

    let pageFiles = builtPages.map(page => ({
      filename: `pages/${page.do_objectID}.json`,
      pageJson: page as unknown as Record<string, unknown>
    }));

    let totalArtboards = builtPages.reduce(
      (sum, p) => sum + (p.layers?.filter(l => l._class === 'artboard').length ?? 0),
      0
    );

    return {
      output: {
        documentJson: documentJson as unknown as Record<string, unknown>,
        metaJson: metaJson as unknown as Record<string, unknown>,
        userJson,
        pages: pageFiles
      },
      message: `Generated Sketch document with **${builtPages.length}** page(s), **${totalArtboards}** artboard(s), **${colorAssets?.length ?? 0}** color asset(s), and **${(sharedStyles?.length ?? 0) + (sharedTextStyles?.length ?? 0)}** shared style(s).`
    };
  })
  .build();
