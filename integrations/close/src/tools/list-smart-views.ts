import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let smartViewSchema = z.object({
  smartViewId: z.string().describe('Unique identifier for the Smart View'),
  name: z.string().describe('Name of the Smart View'),
  query: z.record(z.string(), z.any()).describe('The saved search query object'),
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
      viewType: z
        .enum(['lead', 'contact'])
        .optional()
        .describe('Filter by Smart View type. Omit to list all types.')
    })
  )
  .output(
    z.object({
      smartViews: z.array(smartViewSchema).describe('List of Smart Views')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

    let result = await client.listSmartViews({
      type: ctx.input.viewType
    });

    let views = (result.data ?? []).map((v: any) => ({
      smartViewId: v.id,
      name: v.name,
      query: v.query ?? v.s_query ?? {},
      type: v.type,
      isShared: v.is_shared,
      userId: v.user_id,
      dateCreated: v.date_created
    }));

    return {
      output: {
        smartViews: views
      },
      message: `Found **${views.length}** Smart View(s)${ctx.input.viewType ? ` of type "${ctx.input.viewType}"` : ''}.`
    };
  })
  .build();
