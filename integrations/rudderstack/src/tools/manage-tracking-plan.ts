import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ControlPlaneClient, stringField } from '../lib/client';
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
    destructive: true,
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
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe(
          'Individual event objects to upsert sequentially: properties for the current API, id/property IDs for existing catalog entries, or rules for the older endpoint. A later failure does not roll back earlier updates.'
        ),
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
      events: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Accepted event records; updates can take several minutes to appear.'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ControlPlaneClient({ token: ctx.auth.token, region: ctx.config.region });
    let { action, trackingPlanId, name, description, events, eventId } = ctx.input;
    if (action === 'create') {
      if (!name?.trim()) throw createApiServiceError('Name is required for create.');
      let plan = await client.createTrackingPlan({ name, description });
      return {
        output: {
          trackingPlanId: stringField(plan.id, 'the tracking plan ID'),
          name: typeof plan.name === 'string' ? plan.name : undefined,
          success: true
        },
        message: 'Created the tracking plan.'
      };
    }
    if (!trackingPlanId) throw createApiServiceError('Tracking plan ID is required.');
    if (action === 'update') {
      let plan = await client.updateTrackingPlan(trackingPlanId, { name, description });
      return {
        output: {
          trackingPlanId: stringField(plan.id, 'the tracking plan ID'),
          name: typeof plan.name === 'string' ? plan.name : undefined,
          success: true
        },
        message: 'Updated the tracking plan.'
      };
    }
    if (action === 'delete') {
      await client.deleteTrackingPlan(trackingPlanId);
      return {
        output: { trackingPlanId, deleted: true, success: true },
        message: 'Deleted the tracking plan.'
      };
    }
    if (action === 'delete_event') {
      if (!eventId) throw createApiServiceError('Event ID is required for delete_event.');
      await client.deleteTrackingPlanEvent(trackingPlanId, eventId);
      return {
        output: { trackingPlanId, deleted: true, success: true },
        message: 'Removed the event from the tracking plan; the data catalog event remains.'
      };
    }
    if (!events?.length)
      throw createApiServiceError('Provide at least one event for upsert_events.');
    let acceptedEvents = await client.upsertTrackingPlanEvents(trackingPlanId, events);
    return {
      output: { trackingPlanId, success: true, events: acceptedEvents },
      message:
        'Accepted the event updates. Read the tracking plan events to verify asynchronous processing. Earlier events may have been accepted if a later event fails.'
    };
  })
  .build();
