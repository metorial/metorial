import { SlateTool } from 'slates';
import { z } from 'zod';
import { MakeClient } from '../lib/client';
import { spec } from '../spec';

export let listHooks = SlateTool.create(spec, {
  name: 'List Webhooks',
  key: 'list_hooks',
  description: `Retrieve all webhooks (hooks) for a team. Hooks are incoming trigger endpoints that receive data from external services and can initiate scenario executions. Filter by type or assignment status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z.number().describe('Team ID to list hooks for'),
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
          teamId: z.number().optional().describe('Team ID'),
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
    let client = new MakeClient({
      token: ctx.auth.token,
      zoneUrl: ctx.config.zoneUrl
    });

    let result = await client.listHooks(ctx.input.teamId, {
      typeName: ctx.input.typeName,
      assigned: ctx.input.assigned,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let hooks = (result.hooks ?? result ?? []).map((h: any) => ({
      hookId: h.id,
      name: h.name,
      teamId: h.teamId,
      typeName: h.typeName,
      url: h.url,
      scenarioId: h.scenarioId,
      enabled: h.enabled
    }));

    return {
      output: {
        hooks,
        total: result.pg?.total
      },
      message: `Found **${hooks.length}** webhook(s) in team ${ctx.input.teamId}.`
    };
  })
  .build();
