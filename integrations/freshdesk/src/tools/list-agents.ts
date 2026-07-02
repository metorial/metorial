import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshdeskClient } from '../lib/client';
import { spec } from '../spec';

export let listAgents = SlateTool.create(spec, {
  name: 'List Agents',
  key: 'list_agents',
  description: `Lists agents in the Freshdesk helpdesk. Can filter by email or state. Returns agent details including contact information, roles, and group memberships.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Filter by agent email'),
      state: z.enum(['fulltime', 'occasional']).optional().describe('Filter by agent type'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      agents: z
        .array(
          z.object({
            agentId: z.number().describe('Agent ID'),
            contactId: z.number().describe('Associated contact ID'),
            name: z.string().nullable().describe('Agent name'),
            email: z.string().nullable().describe('Agent email'),
            active: z.boolean().describe('Whether the agent is active'),
            occasional: z.boolean().describe('Whether the agent is an occasional agent'),
            ticketScope: z
              .number()
              .nullable()
              .describe('Ticket scope: 1=Global, 2=Group, 3=Restricted'),
            groupIds: z.array(z.number()).describe('IDs of groups the agent belongs to'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .describe('List of agents')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let agents = await client.listAgents({
      email: ctx.input.email,
      state: ctx.input.state,
      page: ctx.input.page
    });

    let mapped = agents.map((a: any) => ({
      agentId: a.id,
      contactId: a.contact?.id ?? a.contact_id ?? 0,
      name: a.contact?.name ?? null,
      email: a.contact?.email ?? null,
      active: a.available ?? a.active ?? true,
      occasional: a.occasional ?? false,
      ticketScope: a.ticket_scope ?? null,
      groupIds: a.group_ids ?? [],
      createdAt: a.created_at
    }));

    return {
      output: { agents: mapped },
      message: `Retrieved **${mapped.length}** agents`
    };
  })
  .build();
