import { createApiServiceError } from 'slates';
import { z } from 'zod';
import type { SketchDocumentJson, SketchLayer, SketchMetaJson, SketchPage } from './client';

let colorSchema = z
  .object({
    _class: z.literal('color'),
    red: z.number().min(0).max(1),
    green: z.number().min(0).max(1),
    blue: z.number().min(0).max(1),
    alpha: z.number().min(0).max(1)
  })
  .passthrough();

let textAttributesSchema = z
  .object({
    MSAttributedStringColorAttribute: colorSchema.optional()
  })
  .passthrough();

let styleSchema = z
  .object({
    _class: z.literal('style'),
    fills: z
      .array(
        z
          .object({
            isEnabled: z.boolean(),
            color: colorSchema.optional()
          })
          .passthrough()
      )
      .optional(),
    borders: z
      .array(
        z
          .object({
            isEnabled: z.boolean(),
            color: colorSchema.optional()
          })
          .passthrough()
      )
      .optional(),
    textStyle: z
      .object({
        encodedAttributes: textAttributesSchema.optional()
      })
      .passthrough()
      .optional()
  })
  .passthrough();

// Validate the fields these tools read, retaining unknown version-specific data.
// This is deliberately not a validator for the complete Sketch file format.
let layerSchema: z.ZodType<SketchLayer> = z
  .object({
    _class: z.string(),
    do_objectID: z.string(),
    name: z.string(),
    isVisible: z.boolean(),
    isLocked: z.boolean(),
    frame: z
      .object({
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number()
      })
      .passthrough()
      .optional(),
    style: styleSchema.optional(),
    symbolID: z.string().optional(),
    layers: z.array(z.lazy(() => layerSchema)).optional(),
    attributedString: z
      .object({
        _class: z.literal('attributedString'),
        string: z.string(),
        attributes: z
          .array(
            z
              .object({
                attributes: textAttributesSchema
              })
              .passthrough()
          )
          .optional()
      })
      .passthrough()
      .optional()
  })
  .passthrough()
  .superRefine((layer, ctx) => {
    if (layer._class === 'symbolMaster' && !layer.symbolID?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['symbolID'],
        message: 'Symbol sources must include a non-empty symbolID referenced by instances'
      });
    }
  }) as z.ZodType<SketchLayer>;

let sharedStyleSchema = z
  .object({
    name: z.string(),
    value: styleSchema
  })
  .passthrough();

let documentSchema = z
  .object({
    _class: z.literal('document'),
    do_objectID: z.string(),
    assets: z
      .object({
        colors: z.array(colorSchema).optional(),
        colorAssets: z
          .array(
            z
              .object({
                name: z.string().optional(),
                color: colorSchema
              })
              .passthrough()
          )
          .optional()
      })
      .passthrough()
      .optional(),
    layerStyles: z
      .object({
        objects: z.array(sharedStyleSchema).optional()
      })
      .passthrough()
      .optional(),
    layerTextStyles: z
      .object({
        objects: z.array(sharedStyleSchema).optional()
      })
      .passthrough()
      .optional(),
    sharedSwatches: z
      .object({
        objects: z.array(
          z
            .object({
              name: z.string(),
              value: colorSchema
            })
            .passthrough()
        )
      })
      .passthrough()
      .optional()
  })
  .passthrough();

let parseSketchJson = <T>(schema: z.ZodType<T>, value: unknown, field: string): T => {
  let result = schema.safeParse(value);
  if (!result.success) {
    let issue = result.error.issues[0];
    let path = issue?.path.length ? `.${issue.path.map(String).join('.')}` : '';
    throw createApiServiceError(
      `Invalid Sketch JSON at ${field}${path}: ${issue?.message ?? 'invalid value'}. Provide unpacked Sketch document JSON.`
    );
  }
  return result.data;
};

export let parseSketchPages = (value: unknown): SketchPage[] => {
  let pages = parseSketchJson(z.array(layerSchema), value, 'pages');
  return pages.map((page, index) => {
    if (page._class !== 'page') {
      throw createApiServiceError(
        `Invalid Sketch JSON at pages.${index}._class: expected page.`
      );
    }
    return { ...page, _class: 'page', layers: page.layers ?? [] };
  });
};

export let parseSketchDocument = (value: unknown): SketchDocumentJson | undefined =>
  value === undefined
    ? undefined
    : (parseSketchJson(documentSchema, value, 'documentJson') as SketchDocumentJson);

export let parseSketchMeta = (value: unknown): SketchMetaJson | undefined =>
  value === undefined
    ? undefined
    : (parseSketchJson(
        z
          .object({
            appVersion: z.string().optional(),
            version: z.number().optional(),
            fonts: z.array(z.string()).optional()
          })
          .passthrough(),
        value,
        'metaJson'
      ) as SketchMetaJson);
