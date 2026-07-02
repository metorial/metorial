import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAgents = SlateTool.create(spec, {
  name: 'List Agents',
  key: 'list_agents',
  description: `List all agents (users) in the account with their availability status, phone number, timezone, and priority settings.`,
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
            agentId: z.string().describe('ID of the agent'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            phoneNumber: z.string().optional().describe('Phone number'),
            timezone: z.string().optional().describe('Timezone'),
            isAvailable: z
              .boolean()
              .optional()
              .describe('Whether the agent is currently available'),
            priority: z.number().optional().describe('Agent priority level')
          })
        )
        .describe('List of agents')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let result = await client.listAgents();
    let agentsArray = Array.isArray(result) ? result : (result.agents ?? result.data ?? []);

    let agents = agentsArray.map((agent: any) => ({
      agentId: String(agent.id),
      firstName: agent.fname,
      lastName: agent.lname,
      phoneNumber: agent.phone_number,
      timezone: agent.timezone,
      isAvailable: agent.is_available,
      priority: agent.priority
    }));

    return {
      output: { agents },
      message: `Found **${agents.length}** agent(s).`
    };
  })
  .build();
