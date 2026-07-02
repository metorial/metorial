import { SlateTool } from 'slates';
import { z } from 'zod';
import { KommoClient } from '../lib/client';
import { leadOutputSchema, mapLead } from '../lib/schemas';
import { spec } from '../spec';

export let getLeadTool = SlateTool.create(spec, {
  name: 'Get Lead',
  key: 'get_lead',
  description: `Retrieve a single lead by its ID. Returns full lead details including pipeline stage, price, contacts, tags, custom fields, and loss reason.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      leadId: z.number().describe('ID of the lead to retrieve')
    })
  )
  .output(leadOutputSchema)
  .handleInvocation(async ctx => {
    let client = new KommoClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let lead = await client.getLead(ctx.input.leadId);

    return {
      output: mapLead(lead),
      message: `Retrieved lead **${lead.name}** (ID: ${lead.id}).`
    };
  })
  .build();
