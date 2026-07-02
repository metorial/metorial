import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getSlo = SlateTool.create(spec, {
  name: 'Get SLO',
  key: 'get_slo',
  description: `Get details for a Datadog Service Level Objective by ID, including thresholds, tags, monitors, and metric queries.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sloId: z.string().describe('SLO ID to retrieve')
    })
  )
  .output(
    z.object({
      sloId: z.string().describe('SLO ID'),
      name: z.string().optional().describe('SLO name'),
      type: z.string().optional().describe('SLO type'),
      description: z.string().optional().describe('SLO description'),
      tags: z.array(z.string()).optional().describe('SLO tags'),
      thresholds: z.array(z.any()).optional().describe('SLO thresholds'),
      monitorIds: z.array(z.number()).optional().describe('Monitor IDs for monitor SLOs'),
      query: z.any().optional().describe('Metric SLO query definition'),
      groups: z.array(z.string()).optional().describe('SLO groups'),
      createdAt: z.number().optional().describe('Creation timestamp'),
      modifiedAt: z.number().optional().describe('Last modification timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let result = await client.getSLO(ctx.input.sloId);
    let slo = result.data || result;

    return {
      output: {
        sloId: slo.id || ctx.input.sloId,
        name: slo.name,
        type: slo.type,
        description: slo.description,
        tags: slo.tags,
        thresholds: slo.thresholds,
        monitorIds: slo.monitor_ids,
        query: slo.query,
        groups: slo.groups,
        createdAt: slo.created_at,
        modifiedAt: slo.modified_at
      },
      message: `Retrieved SLO **${slo.name || ctx.input.sloId}**`
    };
  })
  .build();
