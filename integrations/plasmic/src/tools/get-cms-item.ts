import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { CmsClient } from '../lib/cms-client';
import { cmsModelIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getCmsItem = SlateTool.create(spec, {
  name: 'Get CMS Item',
  key: 'get_cms_item',
  description:
    'Retrieve one Plasmic CMS item using a field filter such as a unique slug. Call list_cms_models to discover model identifiers and fields. Returns null when no item matches.',
  instructions: [
    'Use a unique field filter, such as { slug: "my-post" }. If several items match, the first is returned.',
    'To filter by system row ID, use { _id: "ROW_ID" }; this only targets the system ID when the model has no user-defined _id field.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      modelId: cmsModelIdSchema,
      where: z
        .record(z.string(), z.unknown())
        .describe('Field conditions identifying the item to retrieve'),
      locale: z.string().optional().describe('Locale tag for localized fields'),
      draft: z
        .boolean()
        .optional()
        .describe('Load the draft version; requires the CMS secret token')
    })
  )
  .output(
    z.object({
      item: z
        .record(z.string(), z.unknown())
        .nullable()
        .describe('Matching CMS item with its ID and content, or null')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.cmsId || !(ctx.auth.cmsPublicToken || ctx.auth.cmsSecretToken)) {
      throw createApiServiceError('CMS ID and a CMS token are required to retrieve an item');
    }
    if (!Object.keys(ctx.input.where).length) {
      throw createApiServiceError(
        'Provide at least one field condition identifying the CMS item'
      );
    }
    let client = new CmsClient({
      cmsId: ctx.auth.cmsId,
      publicToken: ctx.auth.cmsPublicToken,
      secretToken: ctx.auth.cmsSecretToken
    });
    let result = await client.queryItems({ ...ctx.input, limit: 1 });
    let item = result.rows[0] ?? null;
    return {
      output: { item },
      message: item
        ? `Retrieved an item from model \`${ctx.input.modelId}\`.`
        : `No item matched in model \`${ctx.input.modelId}\`.`
    };
  })
  .build();
