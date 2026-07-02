import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  createArtboard,
  createLayer,
  createPage,
  createStyle,
  hexToColor,
  type SketchLayer,
  type SketchLayerClass
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
  width: z.number().optional().describe('Width in points (default: 375 for iPhone)'),
  height: z.number().optional().describe('Height in points (default: 812 for iPhone)'),
  layers: z.array(layerInputSchema).optional().describe('Layers to add to the artboard')
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

export let generatePageTool = SlateTool.create(spec, {
  name: 'Generate Page',
  key: 'generate_page',
  description: `Generate a Sketch page JSON structure with artboards and layers. Creates valid Sketch file format JSON that can be included in a .sketch archive.

Use this to programmatically create page content for Sketch documents, including artboards sized for common device screens and layers with fills, borders, and text.`,
  instructions: [
    'The output is a single page JSON object. To build a full document, use the "Generate Document" tool which assembles pages, document.json, and meta.json together.',
    'Artboard dimensions default to iPhone size (375×812). Common sizes: iPhone (375×812), iPad (768×1024), Desktop (1440×900).'
  ]
})
  .input(
    z.object({
      pageName: z.string().describe('Name of the page'),
      artboards: z
        .array(artboardInputSchema)
        .optional()
        .describe('Artboards to place on the page')
    })
  )
  .output(
    z.object({
      page: z
        .record(z.string(), z.unknown())
        .describe(
          'The generated Sketch page JSON object, ready to be placed in the pages/ folder of a .sketch archive'
        )
    })
  )
  .handleInvocation(async ctx => {
    let artboardLayers: SketchLayer[] = (ctx.input.artboards ?? []).map(ab => {
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

    let page = createPage({
      name: ctx.input.pageName,
      layers: artboardLayers
    });

    return {
      output: {
        page: page as unknown as Record<string, unknown>
      },
      message: `Generated page **"${ctx.input.pageName}"** with **${artboardLayers.length}** artboard(s).`
    };
  })
  .build();
