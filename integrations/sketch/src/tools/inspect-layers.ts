import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  findLayerById,
  findLayersByClass,
  findLayersByName,
  flattenLayers,
  type SketchLayer,
  type SketchLayerClass,
  type SketchPage
} from '../lib/client';
import { spec } from '../spec';

let layerClassEnum = z.enum([
  'artboard',
  'bitmap',
  'group',
  'oval',
  'page',
  'polygon',
  'rectangle',
  'shapePath',
  'shapeGroup',
  'slice',
  'star',
  'symbolInstance',
  'symbolMaster',
  'text',
  'triangle',
  'MSImmutableHotspotLayer'
]);

type LayerSummary = {
  layerClass: string;
  objectId: string;
  name: string;
  isVisible: boolean;
  isLocked: boolean;
  frame?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  textContent?: string;
  symbolId?: string;
  childCount?: number;
};

let toSummary = (layer: SketchLayer): LayerSummary => {
  let summary: LayerSummary = {
    layerClass: layer._class,
    objectId: layer.do_objectID,
    name: layer.name,
    isVisible: layer.isVisible,
    isLocked: layer.isLocked
  };

  if (layer.frame) {
    summary.frame = {
      x: layer.frame.x,
      y: layer.frame.y,
      width: layer.frame.width,
      height: layer.frame.height
    };
  }

  if (layer._class === 'text' && layer.attributedString) {
    summary.textContent = layer.attributedString.string;
  }

  if (
    (layer._class === 'symbolInstance' || layer._class === 'symbolMaster') &&
    layer.symbolID
  ) {
    summary.symbolId = layer.symbolID;
  }

  if (layer.layers && layer.layers.length > 0) {
    summary.childCount = layer.layers.length;
  }

  return summary;
};

export let inspectLayersTool = SlateTool.create(spec, {
  name: 'Inspect Layers',
  key: 'inspect_layers',
  description: `Search and inspect layers within Sketch page JSON data. Find layers by **object ID**, **name**, or **layer class** (e.g. artboard, text, symbolMaster, group, rectangle). Returns a summarized view of matching layers including their type, position, dimensions, visibility, and relevant metadata.

Use this to drill into specific layers or find all layers of a certain type across pages.`,
  instructions: [
    'Provide exactly one of: objectId, layerName, or layerClass to search by.',
    'If searching by layerName, all layers with that exact name will be returned.'
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
      objectId: z.string().optional().describe('Find a single layer by its do_objectID'),
      layerName: z.string().optional().describe('Find all layers matching this exact name'),
      layerClass: layerClassEnum
        .optional()
        .describe(
          'Find all layers of this class type (e.g. "artboard", "text", "symbolMaster")'
        ),
      includeRawJson: z
        .boolean()
        .optional()
        .describe('If true, include the full raw JSON for each matched layer (default: false)')
    })
  )
  .output(
    z.object({
      matchCount: z.number().describe('Number of matching layers found'),
      layers: z
        .array(
          z.object({
            layerClass: z.string().describe('The _class type of the layer'),
            objectId: z.string().describe('Unique object ID of the layer'),
            name: z.string().describe('Name of the layer'),
            isVisible: z.boolean().describe('Whether the layer is visible'),
            isLocked: z.boolean().describe('Whether the layer is locked'),
            frame: z
              .object({
                x: z.number(),
                y: z.number(),
                width: z.number(),
                height: z.number()
              })
              .optional()
              .describe('Position and size of the layer'),
            textContent: z.string().optional().describe('Text content (for text layers)'),
            symbolId: z
              .string()
              .optional()
              .describe('Symbol ID (for symbol masters/instances)'),
            childCount: z.number().optional().describe('Number of direct child layers')
          })
        )
        .describe('Summarized information for each matched layer'),
      rawLayers: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Full raw JSON for each matched layer (only if includeRawJson is true)')
    })
  )
  .handleInvocation(async ctx => {
    let pages = ctx.input.pages as SketchPage[];
    let { objectId, layerName, layerClass, includeRawJson } = ctx.input;

    let matched: LayerSummary[] = [];
    let rawMatched: Record<string, unknown>[] = [];

    if (objectId) {
      for (let page of pages) {
        let found = findLayerById(page.layers ?? [], objectId);
        if (found) {
          matched.push(toSummary(found));
          if (includeRawJson) rawMatched.push(found as Record<string, unknown>);
          break;
        }
      }
    } else if (layerName) {
      for (let page of pages) {
        let found = findLayersByName(page.layers ?? [], layerName);
        for (let layer of found) {
          matched.push(toSummary(layer));
          if (includeRawJson) rawMatched.push(layer as Record<string, unknown>);
        }
      }
    } else if (layerClass) {
      for (let page of pages) {
        let found = findLayersByClass(page.layers ?? [], layerClass as SketchLayerClass);
        for (let layer of found) {
          matched.push(toSummary(layer));
          if (includeRawJson) rawMatched.push(layer as Record<string, unknown>);
        }
      }
    } else {
      for (let page of pages) {
        let all = flattenLayers(page.layers ?? []);
        for (let layer of all) {
          matched.push(toSummary(layer));
          if (includeRawJson) rawMatched.push(layer as Record<string, unknown>);
        }
      }
    }

    let searchDesc = objectId
      ? `object ID "${objectId}"`
      : layerName
        ? `name "${layerName}"`
        : layerClass
          ? `class "${layerClass}"`
          : 'all layers';

    return {
      output: {
        matchCount: matched.length,
        layers: matched,
        rawLayers: includeRawJson ? rawMatched : undefined
      },
      message: `Found **${matched.length}** layer(s) matching ${searchDesc}.`
    };
  })
  .build();
