import { SlateTool } from 'slates';
import { z } from 'zod';
import { CmsClient } from '../lib/cms-client';
import { spec } from '../spec';

export let queryCmsItems = SlateTool.create(spec, {
  name: 'Query CMS Items',
  key: 'query_cms_items',
  description: `Query items from a Plasmic CMS model with optional filtering, pagination, and ordering. Supports a JSON-based query syntax with logical operators (\`$and\`, \`$or\`, \`$not\`) and conditional operators for filtering by field values. Can load draft or published versions and localized content.`,
  instructions: [
    'The `where` field uses a MongoDB-style query syntax. Keys are field names, values are conditions.',
    'Use conditional operators like `$gt`, `$gte`, `$lt`, `$lte`, `$ne`, `$in` within field conditions.',
    'Combine conditions with `$and`, `$or`, `$not` logical operators.',
    'Loading draft items requires the CMS secret token to be configured.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      modelId: z.string().describe('Unique identifier of the CMS model/table to query'),
      where: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Filter conditions as a JSON object. Keys are field names, values are match conditions or operator objects'
        ),
      limit: z.number().optional().describe('Maximum number of items to return'),
      offset: z.number().optional().describe('Number of items to skip for pagination'),
      order: z.string().optional().describe('Field name to order results by'),
      locale: z.string().optional().describe('Locale code for loading localized content'),
      draft: z
        .boolean()
        .optional()
        .describe(
          'Whether to load draft (unpublished) versions of items. Requires CMS secret token'
        )
    })
  )
  .output(
    z.object({
      rows: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of CMS items matching the query')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.cmsId || !ctx.auth.cmsPublicToken) {
      throw new Error('CMS ID and CMS public token are required to query items');
    }

    let client = new CmsClient({
      cmsId: ctx.auth.cmsId,
      publicToken: ctx.auth.cmsPublicToken,
      secretToken: ctx.auth.cmsSecretToken
    });

    let result = await client.queryItems({
      modelId: ctx.input.modelId,
      where: ctx.input.where,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      order: ctx.input.order,
      locale: ctx.input.locale,
      draft: ctx.input.draft
    });

    return {
      output: { rows: result.rows },
      message: `Retrieved **${result.rows.length}** item(s) from model \`${ctx.input.modelId}\`.`
    };
  })
  .build();
