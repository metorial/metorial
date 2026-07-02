import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getLeadHistoryTool = SlateTool.create(spec, {
  name: 'Get Lead History',
  key: 'get_lead_history',
  description: `Retrieve the history of a specific lead in AccuLynx. Shows the timeline of events and changes for the lead.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      leadId: z.string().describe('The unique ID of the lead')
    })
  )
  .output(
    z.object({
      history: z.array(z.record(z.string(), z.any())).describe('Lead history entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getLeadHistory(ctx.input.leadId);
    let history = Array.isArray(result) ? result : (result?.items ?? result?.data ?? [result]);

    return {
      output: { history },
      message: `Retrieved **${history.length}** history entries for lead **${ctx.input.leadId}**.`
    };
  })
  .build();
