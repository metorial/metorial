import { SlateTool } from 'slates';
import { z } from 'zod';
import { ImgixClient } from '../lib/client';
import { spec } from '../spec';

export let getAsset = SlateTool.create(spec, {
  name: 'Get Asset',
  key: 'get_asset',
  description: `Retrieve detailed metadata for a specific asset within an Imgix source. Returns comprehensive information including dimensions, file size, detected colors, face count, content warnings, categories, tags, and custom fields.`,
  constraints: ['Some asset detail attributes are restricted to Enterprise/Premium plans.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sourceId: z.string().describe('ID of the source containing the asset'),
      originPath: z.string().describe('Origin path of the asset (e.g., "images/photo.jpg")')
    })
  )
  .output(
    z.object({
      originPath: z.string().describe('Origin path of the asset'),
      name: z.string().optional().describe('Display name'),
      description: z.string().optional().describe('Asset description'),
      mediaKind: z
        .string()
        .optional()
        .describe('Media type (IMAGE, ANIMATION, DOCUMENT, VECTOR)'),
      mediaHeight: z.number().optional().describe('Height in pixels'),
      mediaWidth: z.number().optional().describe('Width in pixels'),
      fileSize: z.number().optional().describe('File size in bytes'),
      categories: z.array(z.string()).optional().describe('Categories assigned to the asset'),
      tags: z.array(z.string()).optional().describe('Tags assigned to the asset'),
      colors: z.record(z.string(), z.any()).optional().describe('Detected dominant colors'),
      faceCount: z.number().optional().describe('Number of detected faces'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom metadata fields'),
      contentWarnings: z
        .record(z.string(), z.any())
        .optional()
        .describe('Analyzed content warning scores')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ImgixClient(ctx.auth.token);
    let result = await client.getAsset(ctx.input.sourceId, ctx.input.originPath);
    let a = result.data;

    return {
      output: {
        originPath: a.attributes?.origin_path ?? a.id ?? ctx.input.originPath,
        name: a.attributes?.name,
        description: a.attributes?.description,
        mediaKind: a.attributes?.media_kind,
        mediaHeight: a.attributes?.media_height,
        mediaWidth: a.attributes?.media_width,
        fileSize: a.attributes?.file_size,
        categories: a.attributes?.categories,
        tags: a.attributes?.tags,
        colors: a.attributes?.colors,
        faceCount: a.attributes?.face_count,
        customFields: a.attributes?.custom_fields,
        contentWarnings: a.attributes?.analyzed_content_warnings
      },
      message: `Retrieved asset **${ctx.input.originPath}**${a.attributes?.media_kind ? ` (${a.attributes.media_kind})` : ''}.`
    };
  })
  .build();
