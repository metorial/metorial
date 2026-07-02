import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listAgents = SlateTool.create(spec, {
  name: 'List Agents',
  key: 'list_agents',
  description: `List support agents with optional filtering by department and status. Can also retrieve a specific agent by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      agentId: z
        .string()
        .optional()
        .describe('Specific agent ID to retrieve. If omitted, lists agents.'),
      departmentId: z.string().optional().describe('Filter by department ID'),
      status: z.string().optional().describe('Filter by agent status'),
      from: z.number().optional().describe('Starting index for pagination'),
      limit: z.number().optional().describe('Number of agents to return')
    })
  )
  .output(
    z.object({
      agent: z
        .object({
          agentId: z.string().describe('Agent ID'),
          name: z.string().optional().describe('Agent name'),
          email: z.string().optional().describe('Agent email'),
          status: z.string().optional().describe('Agent status'),
          roleId: z.string().optional().describe('Role ID'),
          departmentIds: z.array(z.string()).optional().describe('Associated department IDs')
        })
        .optional()
        .describe('Single agent (when agentId is provided)'),
      agents: z
        .array(
          z.object({
            agentId: z.string().describe('Agent ID'),
            name: z.string().optional().describe('Agent name'),
            email: z.string().optional().describe('Agent email'),
            status: z.string().optional().describe('Agent status')
          })
        )
        .optional()
        .describe('List of agents (when agentId is omitted)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.agentId) {
      let result = await client.getAgent(ctx.input.agentId);

      return {
        output: {
          agent: {
            agentId: result.id,
            name: result.name || `${result.firstName || ''} ${result.lastName || ''}`.trim(),
            email: result.emailId,
            status: result.status,
            roleId: result.roleId,
            departmentIds: result.associatedDepartmentIds
          },
          agents: undefined
        },
        message: `Retrieved agent **${result.name || result.id}**`
      };
    }

    let result = await client.listAgents({
      departmentId: ctx.input.departmentId,
      status: ctx.input.status,
      from: ctx.input.from,
      limit: ctx.input.limit
    });

    let data = Array.isArray(result) ? result : result?.data || [];

    let agents = data.map((a: any) => ({
      agentId: a.id,
      name: a.name || `${a.firstName || ''} ${a.lastName || ''}`.trim(),
      email: a.emailId,
      status: a.status
    }));

    return {
      output: { agent: undefined, agents },
      message: `Found **${agents.length}** agent(s)`
    };
  })
  .build();
