import { createApiServiceError, isApiErrorRecord, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { ZixflowClient } from '../lib/client';
import { operationOutput, providerId, providerRecords, requireInput } from '../lib/response';
import { spec } from '../spec';

export let manageActivities = SlateTool.create(spec, {
  name: 'Manage Activities',
  key: 'manage_activities',
  description: `Create, read, update, or delete activities (tasks) in Zixflow. Activities represent follow-ups, calls, meetings, or other tasks that can be associated with CRM records. Supports scheduling, record associations, statuses, and custom icons.`,
  instructions: [
    'For "create": provide name, iconType, iconValue, and scheduleAt. Optionally associate with a CRM record.',
    'For "get": provide activityId to fetch a single activity.',
    'For "list": provide limit/offset for pagination.',
    'For "update": provide activityId and the fields to update.',
    'For "delete": provide activityId.',
    'iconType can be "emoji", "interaction", or "messaging_app". iconValue depends on the type (e.g., "📞" for emoji).'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'list', 'update', 'delete'])
        .describe('Operation to perform'),
      activityId: z
        .string()
        .optional()
        .describe('Activity ID (required for get, update, delete)'),
      name: z.string().optional().describe('Activity name/title (for create/update)'),
      iconType: z
        .string()
        .optional()
        .describe('Icon type: "emoji", "interaction", or "messaging_app" (for create)'),
      iconValue: z
        .string()
        .optional()
        .describe('Icon value based on type, e.g., "📞" (for create)'),
      scheduleAt: z
        .string()
        .optional()
        .describe('Scheduled time in ISO 8601 format (for create/update)'),
      description: z.string().optional().describe('Activity description (for create/update)'),
      associatedRecordId: z
        .string()
        .optional()
        .describe('Collection record ID to associate with (for create/update)'),
      statusId: z.string().optional().describe('Status attribute ID (for create/update)'),
      limit: z
        .number()
        .optional()
        .describe('Number of activities to return (for list, default: 10)'),
      offset: z.number().optional().describe('Pagination offset (for list, default: 0)'),
      filter: z.array(z.any()).optional().describe('Filter criteria array (for list)'),
      sort: z.array(z.any()).optional().describe('Sort criteria array (for list)')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Complete response returned by Zixflow'),
      success: z.boolean().describe('Whether the operation was successful'),
      responseMessage: z.string().describe('Response message from the API'),
      activityId: z.string().optional().describe('ID of the created/affected activity'),
      activity: z
        .record(z.string(), z.any())
        .optional()
        .describe('Activity data (for get/create)'),
      activities: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of activities (for list)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZixflowClient({ token: ctx.auth.token });
    let { action } = ctx.input;
    if (['get', 'update', 'delete'].includes(action))
      requireInput(ctx.input.activityId, 'activityId');
    let result: any;
    if (action === 'create') {
      result = await client.createActivity({
        name: requireInput(ctx.input.name, 'name'),
        iconType: requireInput(ctx.input.iconType, 'iconType'),
        iconValue: requireInput(ctx.input.iconValue, 'iconValue'),
        scheduleAt: requireInput(ctx.input.scheduleAt, 'scheduleAt'),
        description: ctx.input.description,
        associated: ctx.input.associatedRecordId,
        status: ctx.input.statusId
      });
    } else if (action === 'get') result = await client.getActivity(ctx.input.activityId!);
    else if (action === 'list')
      result = await client.getActivities({
        limit: ctx.input.limit ?? 10,
        offset: ctx.input.offset ?? 0,
        filter: ctx.input.filter,
        sort: ctx.input.sort
      });
    else if (action === 'update') {
      let data = pickDefined({
        name: ctx.input.name,
        iconType: ctx.input.iconType,
        iconValue: ctx.input.iconValue,
        scheduleAt: ctx.input.scheduleAt,
        description: ctx.input.description,
        associated: ctx.input.associatedRecordId,
        status: ctx.input.statusId
      });
      if (!Object.keys(data).length)
        throw createApiServiceError('Provide at least one activity field to update.', {
          reason: 'zixflow_invalid_input'
        });
      result = await client.updateActivity(ctx.input.activityId!, data);
    } else result = await client.deleteActivity(ctx.input.activityId!);

    return {
      output: {
        ...operationOutput(result),
        activityId: providerId(result),
        activity:
          ['create', 'get'].includes(action) && isApiErrorRecord(result.data)
            ? result.data
            : undefined,
        activities: action === 'list' ? providerRecords(result.data) : undefined
      },
      message: `Zixflow ${action} operation confirmed.`
    };
  })
  .build();
