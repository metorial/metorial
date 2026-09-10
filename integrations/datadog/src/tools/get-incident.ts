import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getIncident = SlateTool.create(spec, {
  name: 'Get Incident',
  key: 'get_incident',
  description: `Get details for a Datadog incident by ID, including title, severity, state, customer impact, timestamps, and fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      incidentId: z.string().describe('Incident ID to retrieve')
    })
  )
  .output(
    z.object({
      incidentId: z.string().describe('Incident ID'),
      title: z.string().optional().describe('Incident title'),
      customerImpacted: z.boolean().optional().describe('Whether customers are impacted'),
      severity: z.string().optional().describe('Incident severity'),
      state: z.string().optional().describe('Incident state'),
      created: z.string().optional().describe('Creation timestamp'),
      modified: z.string().optional().describe('Last modification timestamp'),
      resolved: z.string().optional().describe('Resolution timestamp'),
      fields: z.record(z.string(), z.any()).optional().describe('Incident custom fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let result = await client.getIncident(ctx.input.incidentId);
    let incident = result.data || result;

    return {
      output: {
        incidentId: incident.id || ctx.input.incidentId,
        title: incident.attributes?.title ?? undefined,
        customerImpacted: incident.attributes?.customer_impacted ?? undefined,
        severity: incident.attributes?.severity ?? undefined,
        state: incident.attributes?.state ?? undefined,
        created: incident.attributes?.created ?? undefined,
        modified: incident.attributes?.modified ?? undefined,
        resolved: incident.attributes?.resolved ?? undefined,
        fields: incident.attributes?.fields ?? undefined
      },
      message: `Retrieved incident **${incident.attributes?.title || ctx.input.incidentId}**`
    };
  })
  .build();
