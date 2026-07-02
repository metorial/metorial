import { SlateTool } from 'slates';
import { z } from 'zod';
import { ControlPlaneClient } from '../lib/client';
import { spec } from '../spec';

export let listTrackingPlans = SlateTool.create(spec, {
  name: 'List Tracking Plans',
  key: 'list_tracking_plans',
  description: `Retrieve all tracking plans in your workspace, or get the details of a specific tracking plan by ID. Tracking plans define schemas for validating incoming event data.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      trackingPlanId: z
        .string()
        .optional()
        .describe('If provided, fetch details for this specific tracking plan')
    })
  )
  .output(
    z.object({
      trackingPlans: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of tracking plans'),
      trackingPlan: z
        .record(z.string(), z.any())
        .optional()
        .describe('Details of the specific tracking plan')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ControlPlaneClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    if (ctx.input.trackingPlanId) {
      let result = await client.getTrackingPlan(ctx.input.trackingPlanId);
      let plan = result.trackingPlan || result;

      return {
        output: { trackingPlan: plan },
        message: `Retrieved tracking plan \`${ctx.input.trackingPlanId}\`.`
      };
    }

    let result = await client.listTrackingPlans();
    let list = result.trackingPlans || result;

    return {
      output: { trackingPlans: Array.isArray(list) ? list : [] },
      message: `Found **${Array.isArray(list) ? list.length : 0}** tracking plan(s).`
    };
  })
  .build();
