import { SlateTool } from 'slates';
import { z } from 'zod';
import { SegmentClient } from '../lib/client';
import { spec } from '../spec';

export let listTrackingPlans = SlateTool.create(spec, {
  name: 'List Tracking Plans',
  key: 'list_tracking_plans',
  description: `List all tracking plans in the workspace. Optionally retrieve the rules and connected sources for a specific tracking plan.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      trackingPlanId: z
        .string()
        .optional()
        .describe(
          'If provided, retrieves details for this specific tracking plan including rules and connected sources'
        ),
      count: z.number().optional().describe('Number of items per page')
    })
  )
  .output(
    z.object({
      trackingPlans: z
        .array(
          z.object({
            trackingPlanId: z.string().describe('Tracking plan ID'),
            trackingPlanName: z.string().optional().describe('Name'),
            description: z.string().optional().describe('Description'),
            type: z.string().optional().describe('Type'),
            createdAt: z.string().optional().describe('Created timestamp'),
            updatedAt: z.string().optional().describe('Updated timestamp')
          })
        )
        .optional()
        .describe('List of tracking plans (when listing all)'),
      rules: z.array(z.any()).optional().describe('Rules for the specific tracking plan'),
      connectedSources: z
        .array(
          z.object({
            sourceId: z.string().describe('Source ID'),
            sourceName: z.string().optional().describe('Source name')
          })
        )
        .optional()
        .describe('Connected sources for the specific tracking plan')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SegmentClient(ctx.auth.token, ctx.config.region);

    if (ctx.input.trackingPlanId) {
      let [plan, rulesResult, sourcesResult] = await Promise.all([
        client.getTrackingPlan(ctx.input.trackingPlanId),
        client.listTrackingPlanRules(ctx.input.trackingPlanId, { count: ctx.input.count }),
        client.listSourcesFromTrackingPlan(ctx.input.trackingPlanId)
      ]);

      let connectedSources = (sourcesResult?.sources ?? []).map((s: any) => ({
        sourceId: s.id,
        sourceName: s.name
      }));

      return {
        output: {
          trackingPlans: [
            {
              trackingPlanId: plan?.id,
              trackingPlanName: plan?.name,
              description: plan?.description,
              type: plan?.type,
              createdAt: plan?.createdAt,
              updatedAt: plan?.updatedAt
            }
          ],
          rules: rulesResult?.rules ?? [],
          connectedSources
        },
        message: `Tracking plan **${plan?.name}** with ${rulesResult?.rules?.length ?? 0} rules and ${connectedSources.length} connected sources`
      };
    }

    let result = await client.listTrackingPlans({ count: ctx.input.count });
    let trackingPlans = (result?.trackingPlans ?? []).map((p: any) => ({
      trackingPlanId: p.id,
      trackingPlanName: p.name,
      description: p.description,
      type: p.type,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }));

    return {
      output: { trackingPlans },
      message: `Found **${trackingPlans.length}** tracking plans`
    };
  })
  .build();
