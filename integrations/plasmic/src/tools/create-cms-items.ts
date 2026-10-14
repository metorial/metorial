import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { CmsClient } from '../lib/cms-client';
import { cmsModelIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createCmsItems = SlateTool.create(spec, {
  name: 'Create CMS Items',
  key: 'create_cms_items',
  description:
    'Create multiple content entries in a Plasmic CMS model in one request, optionally publishing them immediately. Call list_cms_models to find model identifiers and field definitions. Requires the CMS secret token.',
  tags: { destructive: false }
})
  .input(
    z.object({
      modelId: cmsModelIdSchema,
      items: z
        .array(
          z.object({
            fields: z
              .record(z.string(), z.unknown())
              .describe('Content fields keyed by model field identifiers'),
            identifier: z
              .string()
              .optional()
              .describe('Human-readable identifier for the item')
          })
        )
        .min(1)
        .describe('Content entries to create'),
      publish: z.boolean().optional().describe('Publish all created items immediately')
    })
  )
  .output(
    z.object({
      createdItems: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Created CMS items, including stable row IDs and draft or published content')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.cmsId || !ctx.auth.cmsSecretToken) {
      throw createApiServiceError('CMS ID and secret token are required to create items');
    }
    let client = new CmsClient({
      cmsId: ctx.auth.cmsId,
      publicToken: ctx.auth.cmsPublicToken,
      secretToken: ctx.auth.cmsSecretToken
    });
    let result = await client.createItems({
      modelId: ctx.input.modelId,
      rows: ctx.input.items.map(item => ({ data: item.fields, identifier: item.identifier })),
      publish: ctx.input.publish
    });
    return {
      output: { createdItems: result.rows },
      message: `Created ${result.rows.length} item(s) in model \`${ctx.input.modelId}\`${ctx.input.publish ? ' and published them' : ' as drafts'}.`
    };
  })
  .build();
