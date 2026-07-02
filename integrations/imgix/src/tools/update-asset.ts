import { SlateTool } from 'slates';
import { z } from 'zod';
import { ImgixClient } from '../lib/client';
import { spec } from '../spec';

export let updateAsset = SlateTool.create(spec, {
  name: 'Update Asset',
  key: 'update_asset',
  description: `Update metadata for an asset within an Imgix source. You can modify the asset's name, description, categories, and custom fields. Use this to organize and annotate your image library.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      sourceId: z.string().describe('ID of the source containing the asset'),
      originPath: z.string().describe('Origin path of the asset to update'),
      name: z.string().optional().describe('Updated display name for the asset'),
      description: z.string().optional().describe('Updated description'),
      categories: z.array(z.string()).optional().describe('Updated list of categories'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Updated custom metadata fields (key-value pairs)')
    })
  )
  .output(
    z.object({
      originPath: z.string().describe('Origin path of the updated asset'),
      name: z.string().optional().describe('Updated display name'),
      description: z.string().optional().describe('Updated description'),
      categories: z.array(z.string()).optional().describe('Updated categories'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Updated custom fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ImgixClient(ctx.auth.token);

    let attributes: Record<string, any> = {};
    if (ctx.input.name !== undefined) attributes.name = ctx.input.name;
    if (ctx.input.description !== undefined) attributes.description = ctx.input.description;
    if (ctx.input.categories) attributes.categories = ctx.input.categories;
    if (ctx.input.customFields) attributes.custom_fields = ctx.input.customFields;

    let result = await client.updateAsset(
      ctx.input.sourceId,
      ctx.input.originPath,
      attributes
    );
    let a = result.data;

    return {
      output: {
        originPath: a.attributes?.origin_path ?? a.id ?? ctx.input.originPath,
        name: a.attributes?.name,
        description: a.attributes?.description,
        categories: a.attributes?.categories,
        customFields: a.attributes?.custom_fields
      },
      message: `Updated asset **${ctx.input.originPath}**.`
    };
  })
  .build();
