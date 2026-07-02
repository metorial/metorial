import { SlateTool } from 'slates';
import { z } from 'zod';
import { CmsClient } from '../lib/cms-client';
import { spec } from '../spec';

export let publishCmsItem = SlateTool.create(spec, {
  name: 'Publish CMS Item',
  key: 'publish_cms_item',
  description: `Publish a draft content entry in a Plasmic CMS model, making it publicly visible. Requires the CMS secret token.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      modelId: z
        .string()
        .describe('Unique identifier of the CMS model/table containing the item'),
      rowId: z.string().describe('ID of the row/item to publish')
    })
  )
  .output(
    z.object({
      publishedItem: z.record(z.string(), z.unknown()).describe('The published CMS item')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.cmsId || !ctx.auth.cmsPublicToken || !ctx.auth.cmsSecretToken) {
      throw new Error('CMS ID, public token, and secret token are required to publish items');
    }

    let client = new CmsClient({
      cmsId: ctx.auth.cmsId,
      publicToken: ctx.auth.cmsPublicToken,
      secretToken: ctx.auth.cmsSecretToken
    });

    let result = await client.publishItem({
      modelId: ctx.input.modelId,
      rowId: ctx.input.rowId
    });

    return {
      output: { publishedItem: result },
      message: `Published item \`${ctx.input.rowId}\` in model \`${ctx.input.modelId}\`.`
    };
  })
  .build();
