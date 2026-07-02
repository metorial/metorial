import { SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { spec } from '../spec';

export let deleteContentItem = SlateTool.create(spec, {
  name: 'Delete Content Item',
  key: 'delete_content_item',
  description: `Permanently deletes a content item and all its language variants from Kontent.ai. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      identifier: z
        .string()
        .describe('The ID, codename, or external ID of the content item to delete'),
      identifierType: z
        .enum(['id', 'codename', 'external_id'])
        .default('id')
        .describe('Type of identifier provided')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ManagementClient({
      token: ctx.auth.token,
      environmentId: ctx.config.environmentId
    });

    await client.deleteContentItem(ctx.input.identifier, ctx.input.identifierType);

    return {
      output: { deleted: true },
      message: `Deleted content item \`${ctx.input.identifier}\`.`
    };
  })
  .build();
