import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAgents = SlateTool.create(spec, {
  name: 'List Agents',
  key: 'list_agents',
  description: `List AI voice agents in your Synthflow account. Returns agent details including name, type, phone number, and configuration. Supports pagination for large collections.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Number of agents to return per page (default: 20)'),
      offset: z.number().optional().describe('Starting index for pagination (default: 0)')
    })
  )
  .output(
    z.object({
      agents: z.array(z.record(z.string(), z.any())).describe('List of agent objects'),
      pagination: z
        .object({
          totalRecords: z.number().optional(),
          limit: z.number().optional(),
          offset: z.number().optional()
        })
        .optional()
        .describe('Pagination details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listAgents({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });
    let response = result.response || {};
    let agents = response.assistants || response.models || [];
    let pagination = response.pagination;

    return {
      output: {
        agents: Array.isArray(agents) ? agents : [agents],
        pagination: pagination
          ? {
              totalRecords: pagination.total_records,
              limit: pagination.limit,
              offset: pagination.offset
            }
          : undefined
      },
      message: `Found ${Array.isArray(agents) ? agents.length : 1} agent(s).`
    };
  })
  .build();
