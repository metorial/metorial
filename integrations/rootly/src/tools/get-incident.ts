import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, flattenResource, type JsonApiResource } from '../lib/client';
import { spec } from '../spec';

export let getIncident = SlateTool.create(spec, {
  name: 'Get Incident',
  key: 'get_incident',
  description: `Retrieve detailed information about a specific incident by its ID or slug.
Returns full incident details including status, severity, assigned services, timeline timestamps, and linked integrations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      incidentId: z.string().describe('Incident ID or slug'),
      include: z
        .string()
        .optional()
        .describe(
          'Comma-separated related resources to include, e.g. "services,environments,subscribers"'
        )
    })
  )
  .output(
    z.object({
      incident: z.record(z.string(), z.any()).describe('Full incident details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getIncident(ctx.input.incidentId, ctx.input.include);
    let incident = flattenResource(result.data as JsonApiResource);

    return {
      output: {
        incident
      },
      message: `Retrieved incident **${incident.title}** (status: ${incident.status}).`
    };
  })
  .build();
