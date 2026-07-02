import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteIncident = SlateTool.create(spec, {
  name: 'Delete Incident',
  key: 'delete_incident',
  description: `Delete a Datadog incident by ID. This is destructive and should be used only for incidents created by automation or explicit cleanup.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      incidentId: z.string().describe('Incident ID to delete')
    })
  )
  .output(
    z.object({
      deletedIncidentId: z.string().describe('ID of the deleted incident')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    await client.deleteIncident(ctx.input.incidentId);

    return {
      output: { deletedIncidentId: ctx.input.incidentId },
      message: `Deleted incident **${ctx.input.incidentId}**`
    };
  })
  .build();
