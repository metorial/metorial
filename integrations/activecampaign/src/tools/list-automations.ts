import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAutomations = SlateTool.create(spec, {
  name: 'List Automations',
  key: 'list_automations',
  description: `Lists all available automations with their names, statuses, and entry counts. Use this to find automation IDs for adding or removing contacts.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Maximum number of automations to return (default 20)'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      automations: z.array(
        z.object({
          automationId: z.string(),
          name: z.string().optional(),
          status: z.string().optional(),
          entryCount: z.number().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      ),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    let params: Record<string, any> = {};
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.offset) params.offset = ctx.input.offset;

    let result = await client.listAutomations(params);

    let automations = (result.automations || []).map((a: any) => ({
      automationId: a.id,
      name: a.name || undefined,
      status: a.status !== undefined ? String(a.status) : undefined,
      entryCount: a.entered ? Number(a.entered) : undefined,
      createdAt: a.cdate || undefined,
      updatedAt: a.mdate || undefined
    }));

    let totalCount = result.meta?.total ? Number(result.meta.total) : undefined;

    return {
      output: { automations, totalCount },
      message: `Found **${automations.length}** automations.`
    };
  })
  .build();
