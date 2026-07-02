import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteKpi = SlateTool.create(spec, {
  name: 'Delete KPI',
  key: 'delete_kpi',
  description: `Permanently delete a KPI from SimpleKPI. This will remove the KPI and all associated data entries.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      kpiId: z.number().describe('ID of the KPI to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    await client.deleteKpi(ctx.input.kpiId);

    return {
      output: { success: true },
      message: `Deleted KPI with ID **${ctx.input.kpiId}**.`
    };
  })
  .build();
