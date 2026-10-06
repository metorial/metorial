import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let smartViewSchema = z.object({
  smartViewId: z.string().describe('Unique identifier for the Smart View'),
  name: z.string().describe('Name of the Smart View'),
  query: z.record(z.string(), z.any()).optional().describe('The saved search query object'),
  legacyQuery: z
    .string()
    .optional()
    .describe('Legacy textual query when no structured saved query is available.'),
  type: z.string().optional().describe('Type of Smart View (e.g., "lead", "contact")'),
  isShared: z
    .boolean()
    .optional()
    .describe('Whether the Smart View is shared with the organization'),
  userId: z.string().optional().describe('User ID of the Smart View creator'),
  dateCreated: z
    .string()
    .optional()
    .describe('ISO 8601 timestamp when the Smart View was created')
});

export let listSmartViews = SlateTool.create(spec, {
  name: 'List Smart Views',
  key: 'list_smart_views',
  description: `List saved Smart Views (saved search filters) in Close. Smart Views are pre-configured search queries that can be reused. Optionally filter by view type (lead or contact).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Page size (default 100).'),
      skip: z.number().optional().describe('Offset for the page.'),
      viewType: z
        .enum(['lead', 'contact'])
        .optional()
        .describe('Filter by Smart View type. Omit to list all types.')
    })
  )
  .output(
    z.object({
      hasMore: z.boolean().optional().describe('Whether another page exists.'),
      nextSkip: z.number().optional().describe('Offset for the next page.'),
      smartViews: z.array(smartViewSchema).describe('List of Smart Views')
    })
  )
  .handleInvocation(async ctx => {
    const result = await new Client(ctx.auth).listSmartViews({
      type: ctx.input.viewType,
      limit: ctx.input.limit,
      skip: ctx.input.skip
    });
    const views = result.data.map(v => ({
      smartViewId: v.id,
      name: v.name,
      query: v.s_query ?? (typeof v.query === 'object' ? (v.query ?? undefined) : undefined),
      legacyQuery: typeof v.query === 'string' ? v.query : undefined,
      type: v.type,
      isShared: v.is_shared,
      userId: v.user_id ?? undefined,
      dateCreated: v.date_created
    }));
    return {
      output: {
        smartViews: views,
        hasMore: result.has_more,
        nextSkip: result.has_more ? (ctx.input.skip ?? 0) + views.length : undefined
      },
      message: `Returned ${views.length} Smart View(s)${result.has_more ? '; more available' : ''}.`
    };
  })
  .build();
