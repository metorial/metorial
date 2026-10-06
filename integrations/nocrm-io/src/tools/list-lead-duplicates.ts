import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLeadDuplicates = SlateTool.create(spec, {
  name: 'List Lead Duplicates',
  key: 'list_lead_duplicates',
  description:
    'Find leads that noCRM.io identifies as duplicates of a lead, using the account duplicate-detection fields. Returns IDs to inspect with get_lead.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      leadId: z.number().int().positive().describe('Lead ID to check for duplicates.')
    })
  )
  .output(
    z.object({
      leads: z.array(
        z.object({
          leadId: z.number(),
          title: z.string(),
          status: z.string().optional(),
          userId: z.number().optional(),
          createdAt: z.string().optional(),
          matches: z
            .array(z.array(z.string()))
            .optional()
            .describe('Fields and values matching the original lead.')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let leads = await Client.fromContext(ctx).getLeadDuplicates(ctx.input.leadId);
    return {
      output: {
        leads: leads.map(duplicate => ({
          leadId: duplicate.lead.id,
          title: duplicate.lead.title,
          status: duplicate.lead.status ?? undefined,
          userId: duplicate.lead.user_id ?? undefined,
          createdAt: duplicate.lead.created_at ?? undefined,
          matches: duplicate.matches ?? undefined
        }))
      },
      message: `Found ${leads.length} duplicates of lead ${ctx.input.leadId}.`
    };
  })
  .build();
