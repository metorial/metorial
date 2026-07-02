import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let activityFields = z
  .object({
    activityDateTime: z.string().optional().describe('Activity date/time (ISO 8601 format)'),
    salesRepId: z.number().optional().describe('Sales rep performing the activity'),
    accountId: z.number().optional().describe('Associated account/company ID'),
    contactId: z.number().optional().describe('Associated contact ID'),
    opportunityId: z.number().optional().describe('Associated opportunity ID'),
    activityTypeId: z
      .number()
      .optional()
      .describe('Activity type ID (visit, call, meeting, etc.)'),
    isCheckin: z.boolean().optional().describe('Whether this is a check-in activity'),
    comment: z.string().optional().describe('Activity notes or comments'),
    geocodeLatitude: z.number().optional().describe('Check-in latitude'),
    geocodeLongitude: z.number().optional().describe('Check-in longitude'),
    extId: z.string().optional().describe('External system ID for synchronization')
  })
  .describe('Activity fields to set');

export let manageActivity = SlateTool.create(spec, {
  name: 'Manage Activity',
  key: 'manage_activity',
  description: `Create, update, or delete sales activity records (visits, calls, meetings) in ForceManager.
Activities track sales interactions and can include check-in geolocation data.`,
  instructions: ['Use the "list of values" tool to look up valid activityTypeId values.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      activityId: z
        .number()
        .optional()
        .describe('Activity ID (required for update and delete)'),
      fields: activityFields
        .optional()
        .describe('Activity fields (required for create, optional for update)')
    })
  )
  .output(
    z.object({
      activityId: z.number().optional().describe('ID of the affected activity'),
      message: z.string().optional().describe('Status message'),
      activity: z.any().optional().describe('Full activity record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    if (ctx.input.action === 'create') {
      if (!ctx.input.fields) {
        throw new Error('Fields are required for creating an activity');
      }
      let result = await client.createActivity(ctx.input.fields);
      let activityId = result?.id;
      let activity = activityId ? await client.getActivity(activityId) : result;
      return {
        output: { activityId, message: 'Activity created successfully', activity },
        message: `Created activity (ID: ${activityId})`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.activityId) {
        throw new Error('activityId is required for updating an activity');
      }
      await client.updateActivity(ctx.input.activityId, ctx.input.fields || {});
      let activity = await client.getActivity(ctx.input.activityId);
      return {
        output: {
          activityId: ctx.input.activityId,
          message: 'Activity updated successfully',
          activity
        },
        message: `Updated activity ID **${ctx.input.activityId}**`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.activityId) {
        throw new Error('activityId is required for deleting an activity');
      }
      await client.deleteActivity(ctx.input.activityId);
      return {
        output: { activityId: ctx.input.activityId, message: 'Activity deleted successfully' },
        message: `Deleted activity ID **${ctx.input.activityId}**`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
