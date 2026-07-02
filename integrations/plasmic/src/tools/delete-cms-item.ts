import { SlateTool } from 'slates';
import { z } from 'zod';
import { CmsClient } from '../lib/cms-client';
import { spec } from '../spec';

export let deleteCmsItem = SlateTool.create(spec, {
  name: 'Delete CMS Item',
  key: 'delete_cms_item',
  description: `Permanently delete a content entry from a Plasmic CMS model. This action cannot be undone. Requires the CMS secret token.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      modelId: z
        .string()
        .describe('Unique identifier of the CMS model/table containing the item'),
      rowId: z.string().describe('ID of the row/item to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the item was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.cmsId || !ctx.auth.cmsPublicToken || !ctx.auth.cmsSecretToken) {
      throw new Error('CMS ID, public token, and secret token are required to delete items');
    }

    let client = new CmsClient({
      cmsId: ctx.auth.cmsId,
      publicToken: ctx.auth.cmsPublicToken,
      secretToken: ctx.auth.cmsSecretToken
    });

    await client.deleteItem({
      modelId: ctx.input.modelId,
      rowId: ctx.input.rowId
    });

    return {
      output: { deleted: true },
      message: `Deleted item \`${ctx.input.rowId}\` from model \`${ctx.input.modelId}\`.`
    };
  })
  .build();
