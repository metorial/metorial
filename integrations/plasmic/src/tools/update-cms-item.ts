import { SlateTool } from 'slates';
import { z } from 'zod';
import { CmsClient } from '../lib/cms-client';
import { spec } from '../spec';

export let updateCmsItem = SlateTool.create(spec, {
  name: 'Update CMS Item',
  key: 'update_cms_item',
  description: `Update an existing content entry in a Plasmic CMS model. Only the specified fields will be modified. The item can optionally be published after updating. Requires the CMS secret token.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      modelId: z
        .string()
        .describe('Unique identifier of the CMS model/table containing the item'),
      rowId: z.string().describe('ID of the row/item to update'),
      fields: z
        .record(z.string(), z.unknown())
        .describe('Field values to update. Keys should match the model field identifiers'),
      publish: z.boolean().optional().describe('Whether to publish the item after updating')
    })
  )
  .output(
    z.object({
      updatedItem: z.record(z.string(), z.unknown()).describe('The updated CMS item')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.cmsId || !ctx.auth.cmsPublicToken || !ctx.auth.cmsSecretToken) {
      throw new Error('CMS ID, public token, and secret token are required to update items');
    }

    let client = new CmsClient({
      cmsId: ctx.auth.cmsId,
      publicToken: ctx.auth.cmsPublicToken,
      secretToken: ctx.auth.cmsSecretToken
    });

    let result = await client.updateItem({
      modelId: ctx.input.modelId,
      rowId: ctx.input.rowId,
      data: ctx.input.fields,
      publish: ctx.input.publish
    });

    return {
      output: { updatedItem: result },
      message: `Updated item \`${ctx.input.rowId}\` in model \`${ctx.input.modelId}\`${ctx.input.publish ? ' and published it' : ''}.`
    };
  })
  .build();
