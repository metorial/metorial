import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { CmsClient } from '../lib/cms-client';
import { cmsModelIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let queryCmsItems = SlateTool.create(spec, {
  name: 'Query CMS Items',
  key: 'query_cms_items',
  description: `Query items from a Plasmic CMS model with optional filtering, pagination, and ordering. Supports a JSON-based query syntax with logical operators (\`$and\`, \`$or\`, \`$not\`) and conditional operators for filtering by field values. Can load draft or published versions and localized content.`,
  instructions: [
    'The `where` field uses a MongoDB-style query syntax. Keys are field names, values are conditions.',
    'Use conditional operators like `$gt`, `$ge`, `$lt`, `$le`, `$in`, `$regex` within field conditions.',
    'Combine conditions with `$and`, `$or`, `$not` logical operators.',
    'Loading draft items requires the CMS secret token to be configured.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      modelId: cmsModelIdSchema,
      where: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Filter conditions as a JSON object. Keys are field names, values are match conditions or operator objects'
        ),
      limit: z.number().nonnegative().optional().describe('Maximum number of items to return'),
      offset: z
        .number()
        .nonnegative()
        .optional()
        .describe('Number of items to skip for pagination'),
      order: z.string().optional().describe('Field identifier to order results by'),
      orderDirection: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('Sort direction; defaults to ascending'),
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
    if (!ctx.auth.cmsId || !(ctx.auth.cmsPublicToken || ctx.auth.cmsSecretToken)) {
      throw createApiServiceError('CMS ID and a CMS token are required to query items');
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
      orderDirection: ctx.input.orderDirection,
      locale: ctx.input.locale,
      draft: ctx.input.draft
    });

    return {
      output: { rows: result.rows },
      message: `Retrieved **${result.rows.length}** item(s) from model \`${ctx.input.modelId}\`.`
    };
  })
  .build();
