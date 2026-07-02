import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateFlowStatus = SlateTool.create(spec, {
  name: 'Update Flow Status',
  key: 'update_flow_status',
  description: `Change the status of an automation flow in Klaviyo. Flows can be set to draft, manual, or live status.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      flowId: z.string().describe('Flow ID to update'),
      status: z.enum(['draft', 'manual', 'live']).describe('New status for the flow')
    })
  )
  .output(
    z.object({
      flowId: z.string().describe('Flow ID'),
      name: z.string().optional().describe('Flow name'),
      status: z.string().optional().describe('Updated flow status')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.updateFlowStatus(ctx.input.flowId, ctx.input.status);
    let f = Array.isArray(result.data) ? result.data[0] : result.data;

    return {
      output: {
        flowId: f?.id ?? ctx.input.flowId,
        name: f?.attributes?.name ?? undefined,
        status: f?.attributes?.status ?? ctx.input.status
      },
      message: `Updated flow **${f?.attributes?.name ?? ctx.input.flowId}** to **${ctx.input.status}**`
    };
  })
  .build();
