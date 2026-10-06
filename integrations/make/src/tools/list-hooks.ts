import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';

export let listHooks = SlateTool.create(spec, {
  name: 'List Webhooks',
  key: 'list_hooks',
  description: `Retrieve a bounded page of webhooks (hooks) for a team. Hooks are incoming trigger endpoints that receive data from external services and can initiate scenario executions. Filter by type or assignment status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z
        .number()
        .describe(
          'Team ID; call list_teams after list_organizations to discover authorized IDs. to list hooks for'
        ),
      typeName: z
        .string()
        .optional()
        .describe('Filter by hook type (e.g. "gateway-webhook" or "gateway-mailhook")'),
      assigned: z
        .boolean()
        .optional()
        .describe('Filter by whether the hook is assigned to a scenario'),
      limit: z.number().optional().describe('Maximum number of hooks to return'),
      offset: z.number().optional().describe('Number to skip for pagination')
    })
  )
  .output(
    z.object({
      hooks: z.array(
        z.object({
          hookId: z.number().describe('Hook ID'),
          name: z.string().optional().describe('Hook name'),
          teamId: z
            .number()
            .optional()
            .describe(
              'Team ID; call list_teams after list_organizations to discover authorized IDs.'
            ),
          typeName: z.string().optional().describe('Hook type'),
          url: z.string().optional().describe('Hook URL for receiving data'),
          scenarioId: z.number().optional().describe('Associated scenario ID'),
          enabled: z.boolean().optional().describe('Whether the hook is enabled')
        })
      ),
      total: z.number().optional().describe('Total number of hooks')
    })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx);
    const result = await client.listHooks(ctx.input.teamId, ctx.input);
    const hooks = result.hooks.map(h => ({
      hookId: h.id,
      name: h.name,
      teamId: h.teamId,
      typeName: h.typeName,
      url: h.url ?? undefined,
      scenarioId: h.scenarioId ?? undefined,
      enabled: h.enabled
    }));
    return {
      output: { hooks, total: result.total },
      message: `Returned ${hooks.length} hooks from the bounded native collection.`
    };
  })
  .build();
