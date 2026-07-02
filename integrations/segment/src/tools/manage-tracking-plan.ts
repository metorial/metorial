import { SlateTool } from 'slates';
import { z } from 'zod';
import { SegmentClient } from '../lib/client';
import { spec } from '../spec';

export let manageTrackingPlan = SlateTool.create(spec, {
  name: 'Manage Tracking Plan',
  key: 'manage_tracking_plan',
  description: `Create, update, delete, or connect tracking plans. Tracking plans define expected event schemas and validate incoming data against those schemas. Violations generate when events don't match the spec.`,
  instructions: [
    'To create a tracking plan, provide a name and optionally description/rules.',
    'To update, provide trackingPlanId and fields to change.',
    'To delete, provide trackingPlanId and set action to "delete".',
    'To connect a source, set action to "connect_source" and provide both trackingPlanId and sourceId.',
    'To disconnect a source, set action to "disconnect_source".'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'connect_source', 'disconnect_source'])
        .describe('Operation to perform'),
      trackingPlanId: z
        .string()
        .optional()
        .describe('Tracking plan ID (required for update/delete/connect/disconnect)'),
      name: z.string().optional().describe('Tracking plan name (required for create)'),
      description: z.string().optional().describe('Description of the tracking plan'),
      type: z.string().optional().describe('Type of tracking plan (e.g. "LIVE")'),
      rules: z
        .record(z.string(), z.any())
        .optional()
        .describe('JSON Schema rules for the tracking plan'),
      sourceId: z.string().optional().describe('Source ID to connect/disconnect')
    })
  )
  .output(
    z.object({
      trackingPlanId: z.string().optional().describe('ID of the tracking plan'),
      trackingPlanName: z.string().optional().describe('Name of the tracking plan'),
      description: z.string().optional().describe('Description'),
      deleted: z.boolean().optional().describe('Whether deleted'),
      connected: z.boolean().optional().describe('Whether source was connected'),
      disconnected: z.boolean().optional().describe('Whether source was disconnected')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SegmentClient(ctx.auth.token, ctx.config.region);

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) {
        throw new Error('name is required to create a tracking plan');
      }
      let plan = await client.createTrackingPlan({
        name: ctx.input.name,
        description: ctx.input.description,
        type: ctx.input.type,
        rules: ctx.input.rules
      });
      return {
        output: {
          trackingPlanId: plan?.id,
          trackingPlanName: plan?.name,
          description: plan?.description
        },
        message: `Created tracking plan **${plan?.name ?? ctx.input.name}**`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.trackingPlanId) {
        throw new Error('trackingPlanId is required to update a tracking plan');
      }
      let plan = await client.updateTrackingPlan(ctx.input.trackingPlanId, {
        name: ctx.input.name,
        description: ctx.input.description
      });
      return {
        output: {
          trackingPlanId: ctx.input.trackingPlanId,
          trackingPlanName: plan?.trackingPlan?.name,
          description: plan?.trackingPlan?.description
        },
        message: `Updated tracking plan **${ctx.input.trackingPlanId}**`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.trackingPlanId) {
        throw new Error('trackingPlanId is required to delete a tracking plan');
      }
      await client.deleteTrackingPlan(ctx.input.trackingPlanId);
      return {
        output: {
          trackingPlanId: ctx.input.trackingPlanId,
          deleted: true
        },
        message: `Deleted tracking plan **${ctx.input.trackingPlanId}**`
      };
    }

    if (ctx.input.action === 'connect_source') {
      if (!ctx.input.trackingPlanId || !ctx.input.sourceId) {
        throw new Error('trackingPlanId and sourceId are required');
      }
      await client.connectSourceToTrackingPlan(ctx.input.trackingPlanId, ctx.input.sourceId);
      return {
        output: {
          trackingPlanId: ctx.input.trackingPlanId,
          connected: true
        },
        message: `Connected source \`${ctx.input.sourceId}\` to tracking plan **${ctx.input.trackingPlanId}**`
      };
    }

    if (ctx.input.action === 'disconnect_source') {
      if (!ctx.input.trackingPlanId || !ctx.input.sourceId) {
        throw new Error('trackingPlanId and sourceId are required');
      }
      await client.disconnectSourceFromTrackingPlan(
        ctx.input.trackingPlanId,
        ctx.input.sourceId
      );
      return {
        output: {
          trackingPlanId: ctx.input.trackingPlanId,
          disconnected: true
        },
        message: `Disconnected source \`${ctx.input.sourceId}\` from tracking plan **${ctx.input.trackingPlanId}**`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
