import { SlateTool } from 'slates';
import { z } from 'zod';
import { ControlPlaneClient } from '../lib/client';
import { spec } from '../spec';

export let manageTrackingPlan = SlateTool.create(spec, {
  name: 'Manage Tracking Plan',
  key: 'manage_tracking_plan',
  description: `Create, update, or delete a RudderStack tracking plan. Tracking plans monitor and validate incoming event data against predefined schemas, flagging violations like unplanned events or incorrect properties.
Also supports upserting or removing events within a tracking plan.`,
  instructions: [
    'Tracking plan names must be 3-65 characters, start with a letter, and contain only letters, numbers, underscores, commas, spaces, dashes, and dots.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'upsert_events', 'delete_event'])
        .describe('Action to perform on the tracking plan'),
      trackingPlanId: z
        .string()
        .optional()
        .describe(
          'Tracking plan ID (required for update, delete, upsert_events, delete_event)'
        ),
      name: z.string().optional().describe('Tracking plan name (required for create)'),
      description: z.string().optional().describe('Tracking plan description'),
      events: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Events to upsert into the tracking plan (for upsert_events action)'),
      eventId: z
        .string()
        .optional()
        .describe('Event ID to remove from the tracking plan (for delete_event action)')
    })
  )
  .output(
    z.object({
      trackingPlanId: z.string().optional().describe('ID of the tracking plan'),
      name: z.string().optional().describe('Name of the tracking plan'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the tracking plan or event was deleted'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ControlPlaneClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let { action, trackingPlanId, name, description, events, eventId } = ctx.input;

    if (action === 'create') {
      if (!name) throw new Error('Name is required when creating a tracking plan.');

      let result = await client.createTrackingPlan({ name, description });
      let plan = result.trackingPlan || result;

      return {
        output: {
          trackingPlanId: plan.id,
          name: plan.name,
          success: true
        },
        message: `Created tracking plan **${plan.name}** (\`${plan.id}\`).`
      };
    }

    if (action === 'update') {
      if (!trackingPlanId) throw new Error('Tracking plan ID is required for update.');

      let result = await client.updateTrackingPlan(trackingPlanId, { name, description });
      let plan = result.trackingPlan || result;

      return {
        output: {
          trackingPlanId: plan.id || trackingPlanId,
          name: plan.name || name,
          success: true
        },
        message: `Updated tracking plan \`${trackingPlanId}\`.`
      };
    }

    if (action === 'delete') {
      if (!trackingPlanId) throw new Error('Tracking plan ID is required for delete.');

      await client.deleteTrackingPlan(trackingPlanId);

      return {
        output: {
          trackingPlanId,
          deleted: true,
          success: true
        },
        message: `Deleted tracking plan \`${trackingPlanId}\`.`
      };
    }

    if (action === 'upsert_events') {
      if (!trackingPlanId)
        throw new Error('Tracking plan ID is required for upserting events.');
      if (!events || events.length === 0)
        throw new Error('Events array is required for upsert_events action.');

      await client.upsertTrackingPlanEvents(trackingPlanId, events);

      return {
        output: {
          trackingPlanId,
          success: true
        },
        message: `Upserted **${events.length}** event(s) into tracking plan \`${trackingPlanId}\`.`
      };
    }

    if (action === 'delete_event') {
      if (!trackingPlanId)
        throw new Error('Tracking plan ID is required for deleting an event.');
      if (!eventId) throw new Error('Event ID is required for delete_event action.');

      await client.deleteTrackingPlanEvent(trackingPlanId, eventId);

      return {
        output: {
          trackingPlanId,
          deleted: true,
          success: true
        },
        message: `Deleted event \`${eventId}\` from tracking plan \`${trackingPlanId}\`.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
