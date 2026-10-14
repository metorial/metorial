import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { CmsClient } from '../lib/cms-client';
import { cmsModelIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createCmsItem = SlateTool.create(spec, {
  name: 'Create CMS Item',
  key: 'create_cms_item',
  description: `Create a new content entry in a Plasmic CMS model. The item can optionally be published immediately upon creation. Requires the CMS secret token.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      modelId: cmsModelIdSchema,
      fields: z
        .record(z.string(), z.unknown())
        .describe(
          'Field values for the new item. Keys should match the model field identifiers'
        ),
      identifier: z.string().optional().describe('Human-readable identifier for the CMS item'),
      publish: z
        .boolean()
        .optional()
        .describe('Whether to immediately publish the item after creation')
    })
  )
  .output(
    z.object({
      createdItem: z.record(z.string(), z.unknown()).describe('The newly created CMS item')
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

    let result = await client.createItem({
      modelId: ctx.input.modelId,
      data: ctx.input.fields,
      identifier: ctx.input.identifier,
      publish: ctx.input.publish
    });

    return {
      output: { createdItem: result },
      message: `Created a new item in model \`${ctx.input.modelId}\`${ctx.input.publish ? ' and published it' : ' as a draft'}.`
    };
  })
  .build();
