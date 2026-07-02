import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, extractPaginationCursor } from '../lib/helpers';
import { spec } from '../spec';

export let getFlows = SlateTool.create(spec, {
  name: 'Get Flows',
  key: 'get_flows',
  description: `Retrieve automation flows from Klaviyo. Flows are automated messaging workflows triggered by events, list membership, or dates.
Can fetch a specific flow by ID or list all flows. Optionally include flow actions.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      flowId: z
        .string()
        .optional()
        .describe('Specific flow ID to retrieve. Omit to list all flows.'),
      includeActions: z.boolean().optional().describe('Include flow actions in the response'),
      filter: z.string().optional().describe('Filter string for listing flows'),
      sort: z.string().optional().describe('Sort field, e.g. "name" or "-created"'),
      pageCursor: z.string().optional().describe('Pagination cursor'),
      pageSize: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      flows: z
        .array(
          z.object({
            flowId: z.string().describe('Flow ID'),
            name: z.string().optional().describe('Flow name'),
            status: z.string().optional().describe('Flow status (draft, manual, live)'),
            triggerType: z.string().optional().describe('Trigger type'),
            created: z.string().optional().describe('Creation timestamp'),
            updated: z.string().optional().describe('Last updated timestamp'),
            archived: z.boolean().optional().describe('Whether the flow is archived'),
            actions: z.array(z.any()).optional().describe('Flow actions')
          })
        )
        .describe('List of flows'),
      nextCursor: z.string().optional().describe('Cursor for next page'),
      hasMore: z.boolean().describe('Whether more results exist')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.flowId) {
      let result = await client.getFlow(ctx.input.flowId, {
        include: ctx.input.includeActions ? ['flow-actions'] : undefined
      });
      let f = Array.isArray(result.data) ? result.data[0] : result.data;
      let actions = result.included?.filter(r => r.type === 'flow-action') ?? [];

      return {
        output: {
          flows: [
            {
              flowId: f?.id ?? '',
              name: f?.attributes?.name,
              status: f?.attributes?.status,
              triggerType: f?.attributes?.trigger_type,
              created: f?.attributes?.created,
              updated: f?.attributes?.updated,
              archived: f?.attributes?.archived,
              actions:
                actions.length > 0
                  ? actions.map(a => ({
                      actionId: a.id,
                      type: a.attributes?.action_type,
                      status: a.attributes?.status,
                      settings: a.attributes?.settings
                    }))
                  : undefined
            }
          ],
          hasMore: false
        },
        message: `Retrieved flow **${f?.attributes?.name ?? ctx.input.flowId}** (${f?.attributes?.status ?? 'unknown'})`
      };
    }

    let result = await client.getFlows({
      filter: ctx.input.filter,
      sort: ctx.input.sort,
      pageCursor: ctx.input.pageCursor,
      pageSize: ctx.input.pageSize
    });

    let flows = result.data.map(f => ({
      flowId: f.id ?? '',
      name: f.attributes?.name ?? undefined,
      status: f.attributes?.status ?? undefined,
      triggerType: f.attributes?.trigger_type ?? undefined,
      created: f.attributes?.created ?? undefined,
      updated: f.attributes?.updated ?? undefined,
      archived: f.attributes?.archived ?? undefined
    }));

    let nextCursor = extractPaginationCursor(result.links);

    return {
      output: { flows, nextCursor, hasMore: !!nextCursor },
      message: `Retrieved **${flows.length}** flows`
    };
  })
  .build();
