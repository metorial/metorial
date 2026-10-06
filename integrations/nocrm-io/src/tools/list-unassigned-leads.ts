import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUnassignedLeads = SlateTool.create(spec, {
  name: 'List Unassigned Leads',
  key: 'list_unassigned_leads',
  description:
    'List leads waiting for an owner. Use the returned lead IDs with update_lead to assign a sales representative. User-token connections need permission to view unassigned leads.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum leads to return, up to 100. Defaults to 100.')
    })
  )
  .output(
    z.object({
      leads: z.array(
        z.object({
          leadId: z.number(),
          title: z.string(),
          description: z.string().optional(),
          createdAt: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let leads = await Client.fromContext(ctx).listUnassignedLeads(ctx.input.limit);
    return {
      output: {
        leads: leads.map(lead => ({
          leadId: lead.id,
          title: lead.title,
          description: lead.description ?? undefined,
          createdAt: lead.created_at ?? undefined
        }))
      },
      message: `Found ${leads.length} unassigned leads.`
    };
  })
  .build();
