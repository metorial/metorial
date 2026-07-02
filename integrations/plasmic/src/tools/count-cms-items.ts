import { SlateTool } from 'slates';
import { z } from 'zod';
import { CmsClient } from '../lib/cms-client';
import { spec } from '../spec';

export let countCmsItems = SlateTool.create(spec, {
  name: 'Count CMS Items',
  key: 'count_cms_items',
  description: `Count the number of items in a Plasmic CMS model, optionally filtered by field conditions. Uses the same query syntax as the Query CMS Items tool but returns only the count.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      modelId: z.string().describe('Unique identifier of the CMS model/table to count'),
      where: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Filter conditions as a JSON object'),
      locale: z.string().optional().describe('Locale code for counting localized content'),
      draft: z
        .boolean()
        .optional()
        .describe('Whether to count draft (unpublished) versions. Requires CMS secret token')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Number of items matching the filter criteria')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.cmsId || !ctx.auth.cmsPublicToken) {
      throw new Error('CMS ID and CMS public token are required to count items');
    }

    let client = new CmsClient({
      cmsId: ctx.auth.cmsId,
      publicToken: ctx.auth.cmsPublicToken,
      secretToken: ctx.auth.cmsSecretToken
    });

    let result = await client.countItems({
      modelId: ctx.input.modelId,
      where: ctx.input.where,
      locale: ctx.input.locale,
      draft: ctx.input.draft
    });

    return {
      output: { count: result.count },
      message: `Found **${result.count}** item(s) in model \`${ctx.input.modelId}\`.`
    };
  })
  .build();
