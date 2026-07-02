import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLeadStatuses = SlateTool.create(spec, {
  name: 'List Lead Statuses',
  key: 'list_lead_statuses',
  description: `Retrieve all available lead statuses configured for your PersistIQ account. Useful for understanding which statuses can be assigned to leads when updating their status.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      statuses: z
        .array(
          z.object({
            statusId: z.string().optional().describe('Unique identifier for the status'),
            name: z.string().optional().nullable().describe('Name of the status')
          })
        )
        .describe('List of available lead statuses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listLeadStatuses();

    let statuses = (result.lead_statuses || result.statuses || []).map((s: any) => ({
      statusId: s.id,
      name: s.name || s.status
    }));

    return {
      output: { statuses },
      message: `Retrieved **${statuses.length}** lead statuses.`
    };
  })
  .build();
