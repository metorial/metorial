import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteKpiEntry = SlateTool.create(spec, {
  name: 'Delete KPI Entry',
  key: 'delete_kpi_entry',
  description: `Permanently delete a KPI data entry by its ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      entryId: z.number().describe('ID of the KPI entry to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    await client.deleteKpiEntry(ctx.input.entryId);

    return {
      output: { success: true },
      message: `Deleted KPI entry with ID **${ctx.input.entryId}**.`
    };
  })
  .build();
