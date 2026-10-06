import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { leadOutputSchema, mapLead } from '../lib/lead';
import { spec } from '../spec';

export const getLead = SlateTool.create(spec, {
  name: 'Get Lead',
  key: 'get_lead',
  description:
    'Retrieve a saved Hunter lead by ID, including its list and creator metadata. Call list_leads to discover authorized lead IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({ leadId: z.number().describe('Lead ID returned by list_leads or manage_lead.') })
  )
  .output(leadOutputSchema)
  .handleInvocation(async ctx => {
    const result = await new Client({ token: ctx.auth.token }).getLead(ctx.input.leadId);
    return {
      output: mapLead(result.data),
      message: `Retrieved lead **${ctx.input.leadId}**.`
    };
  })
  .build();
