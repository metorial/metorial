import { SlateTool } from 'slates';
import { z } from 'zod';
import { FetchClient } from '../lib/client';
import { spec } from '../spec';

export let listContent = SlateTool.create(spec, {
  name: 'List Content',
  key: 'list_content',
  description: `Retrieves a list of content items by their model reference name from the Content Fetch API. Supports pagination, sorting, filtering, and field selection. Use filter expressions like \`fields.title[eq]"Hello"\` or \`fields.date[gt]"2024-01-01"\`.`,
  instructions: [
    'The referenceName must be lowercased when used in the API.',
    'Filter operators: eq, ne, lt, gt, lte, gte, in, contains, like. Combine with AND/OR.',
    'Max 50 items per request (take parameter).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      referenceName: z
        .string()
        .describe(
          'Reference name of the content list/model (will be lowercased automatically)'
        ),
      skip: z
        .number()
        .optional()
        .default(0)
        .describe('Number of items to skip for pagination'),
      take: z.number().optional().default(10).describe('Number of items to return (max 50)'),
      sort: z
        .string()
        .optional()
        .describe(
          'Field to sort by (e.g., "properties.modified", "properties.created", "fields.title")'
        ),
      direction: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
      filter: z
        .string()
        .optional()
        .describe('Filter expression (e.g., fields.title[eq]"Hello")'),
      fields: z.string().optional().describe('Comma-separated list of fields to return'),
      contentLinkDepth: z
        .number()
        .optional()
        .describe('Levels of linked content to resolve (1-5)'),
      locale: z.string().optional().describe('Locale code override'),
      apiType: z
        .enum(['fetch', 'preview'])
        .default('fetch')
        .describe('Use "fetch" for published or "preview" for staging content')
    })
  )
  .output(
    z.object({
      items: z.array(z.record(z.string(), z.any())).describe('Array of content items'),
      totalCount: z.number().describe('Total number of items in the list')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FetchClient({
      token: ctx.auth.token,
      guid: ctx.config.guid,
      locale: ctx.input.locale || ctx.config.locale,
      region: ctx.auth.region,
      apiType: ctx.input.apiType
    });

    let result = await client.getContentList(ctx.input.referenceName.toLowerCase(), {
      skip: ctx.input.skip,
      take: ctx.input.take,
      sort: ctx.input.sort,
      direction: ctx.input.direction,
      filter: ctx.input.filter,
      fields: ctx.input.fields,
      contentLinkDepth: ctx.input.contentLinkDepth
    });

    let items = result.items || [];
    let totalCount = result.totalCount ?? items.length;

    return {
      output: {
        items,
        totalCount
      },
      message: `Retrieved **${items.length}** of **${totalCount}** items from list **${ctx.input.referenceName}**`
    };
  })
  .build();
