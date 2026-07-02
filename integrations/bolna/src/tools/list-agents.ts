import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAgents = SlateTool.create(spec, {
  name: 'List Agents',
  key: 'list_agents',
  description: `List all Voice AI agents in the Bolna account with their names, statuses, and creation dates.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      agents: z
        .array(
          z.object({
            agentId: z.string().describe('Agent ID'),
            agentName: z.string().describe('Agent name'),
            agentStatus: z.string().optional().describe('Agent processing status'),
            agentType: z.string().optional().describe('Agent type'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp')
          })
        )
        .describe('List of agents'),
      totalCount: z.number().describe('Total number of agents')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let agents = await client.listAgents();

    let agentList = Array.isArray(agents) ? agents : [];

    return {
      output: {
        agents: agentList.map((a: any) => ({
          agentId: a.id,
          agentName: a.agent_name,
          agentStatus: a.agent_status,
          agentType: a.agent_type,
          createdAt: a.created_at,
          updatedAt: a.updated_at
        })),
        totalCount: agentList.length
      },
      message: `Found **${agentList.length}** agent(s).`
    };
  })
  .build();
