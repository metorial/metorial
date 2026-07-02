import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteSlo = SlateTool.create(spec, {
  name: 'Delete SLO',
  key: 'delete_slo',
  description: `Delete a Datadog Service Level Objective by ID. Use this to clean up temporary or obsolete SLOs.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      sloId: z.string().describe('SLO ID to delete')
    })
  )
  .output(
    z.object({
      deletedSloId: z.string().describe('ID of the deleted SLO')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    await client.deleteSLO(ctx.input.sloId);

    return {
      output: { deletedSloId: ctx.input.sloId },
      message: `Deleted SLO **${ctx.input.sloId}**`
    };
  })
  .build();
