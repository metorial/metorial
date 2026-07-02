import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshdeskClient } from '../lib/client';
import { spec } from '../spec';

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `Lists all agent groups in Freshdesk. Groups are used for ticket assignment and routing.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      groups: z
        .array(
          z.object({
            groupId: z.number().describe('Group ID'),
            name: z.string().describe('Group name'),
            description: z.string().nullable().describe('Group description'),
            agentIds: z.array(z.number()).describe('IDs of agents in this group'),
            autoTicketAssign: z
              .boolean()
              .describe('Whether auto ticket assignment is enabled'),
            escalateTo: z.number().nullable().describe('Agent ID to escalate to'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp')
          })
        )
        .describe('List of groups')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let groups = await client.listGroups(ctx.input.page);

    let mapped = groups.map((g: any) => ({
      groupId: g.id,
      name: g.name,
      description: g.description ?? null,
      agentIds: g.agent_ids ?? [],
      autoTicketAssign: g.auto_ticket_assign ?? false,
      escalateTo: g.escalate_to ?? null,
      createdAt: g.created_at,
      updatedAt: g.updated_at
    }));

    return {
      output: { groups: mapped },
      message: `Retrieved **${mapped.length}** groups`
    };
  })
  .build();
