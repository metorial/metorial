import { SlateTool } from 'slates';
import { z } from 'zod';
import { ControlPlaneClient } from '../lib/client';
import { spec } from '../spec';

export const listTrackingPlanEvents = SlateTool.create(spec, {
  name: 'List Tracking Plan Events',
  key: 'list_tracking_plan_events',
  description:
    'Read events attached to a tracking plan, including the IDs needed to inspect and remove them. Queued updates may take several minutes to appear.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      trackingPlanId: z.string().describe('Tracking plan ID.'),
      page: z
        .number()
        .optional()
        .describe('Page number, starting at 1; the provider supports at most 50 pages.')
    })
  )
  .output(
    z.object({
      events: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Events attached to the tracking plan.'),
      total: z.number().optional().describe('Provider total.'),
      currentPage: z.number().optional().describe('Current provider page.'),
      pageSize: z.number().optional().describe('Maximum entries per provider page.')
    })
  )
  .handleInvocation(async ctx => {
    const output = await new ControlPlaneClient({
      token: ctx.auth.token,
      region: ctx.config.region
    }).listTrackingPlanEvents(ctx.input.trackingPlanId, ctx.input.page);
    return { output, message: `Retrieved ${output.events.length} tracking plan event(s).` };
  })
  .build();
