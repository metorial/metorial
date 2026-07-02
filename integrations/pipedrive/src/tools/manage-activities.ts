import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { pipedriveServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageActivities = SlateTool.create(spec, {
  name: 'Manage Activities',
  key: 'manage_activities',
  description: `Create, update, or delete activities (calls, meetings, tasks, etc.) in Pipedrive. Activities can be linked to deals, persons, and organizations.
Supports setting subject, type, due date/time, duration, location, notes, and completion status.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      activityId: z
        .number()
        .optional()
        .describe('Activity ID (required for update and delete)'),
      subject: z.string().optional().describe('Activity subject/title'),
      type: z
        .string()
        .optional()
        .describe('Activity type key (e.g. "call", "meeting", "task", "email")'),
      dueDate: z.string().optional().describe('Due date (YYYY-MM-DD)'),
      dueTime: z.string().optional().describe('Due time (HH:MM)'),
      duration: z.string().optional().describe('Duration (HH:MM)'),
      dealId: z.number().optional().describe('Deal ID to link'),
      personId: z.number().optional().describe('Person ID to link'),
      organizationId: z.number().optional().describe('Organization ID to link'),
      note: z.string().optional().describe('Additional notes (HTML allowed)'),
      location: z.string().optional().describe('Activity location'),
      done: z.enum(['0', '1']).optional().describe('Completion status: 0=not done, 1=done'),
      busyFlag: z.boolean().optional().describe('Whether the activity is marked as busy')
    })
  )
  .output(
    z.object({
      activityId: z.number().describe('Activity ID'),
      subject: z.string().optional().describe('Activity subject'),
      type: z.string().optional().describe('Activity type'),
      dueDate: z.string().optional().nullable().describe('Due date'),
      dueTime: z.string().optional().nullable().describe('Due time'),
      duration: z.string().optional().nullable().describe('Duration'),
      done: z.boolean().optional().describe('Whether the activity is done'),
      dealId: z.number().optional().nullable().describe('Linked deal ID'),
      personId: z.number().optional().nullable().describe('Linked person ID'),
      organizationId: z.number().optional().nullable().describe('Linked organization ID'),
      addTime: z.string().optional().describe('Creation timestamp'),
      updateTime: z.string().optional().nullable().describe('Last update timestamp'),
      deleted: z.boolean().optional().describe('Whether the activity was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.action === 'delete') {
      if (!ctx.input.activityId)
        throw pipedriveServiceError('activityId is required for delete action');
      await client.deleteActivity(ctx.input.activityId);
      return {
        output: { activityId: ctx.input.activityId, deleted: true },
        message: `Activity **#${ctx.input.activityId}** has been deleted.`
      };
    }

    let body: Record<string, any> = {};
    if (ctx.input.subject) body.subject = ctx.input.subject;
    if (ctx.input.type) body.type = ctx.input.type;
    if (ctx.input.dueDate) body.due_date = ctx.input.dueDate;
    if (ctx.input.dueTime) body.due_time = ctx.input.dueTime;
    if (ctx.input.duration) body.duration = ctx.input.duration;
    if (ctx.input.dealId) body.deal_id = ctx.input.dealId;
    if (ctx.input.personId) body.person_id = ctx.input.personId;
    if (ctx.input.organizationId) body.org_id = ctx.input.organizationId;
    if (ctx.input.note) body.note = ctx.input.note;
    if (ctx.input.location) body.location = ctx.input.location;
    if (ctx.input.done !== undefined) body.done = ctx.input.done;
    if (ctx.input.busyFlag !== undefined) body.busy_flag = ctx.input.busyFlag;

    let result: any;
    if (ctx.input.action === 'create') {
      result = await client.createActivity(body);
    } else {
      if (!ctx.input.activityId)
        throw pipedriveServiceError('activityId is required for update action');
      result = await client.updateActivity(ctx.input.activityId, body);
    }

    let activity = result?.data;
    let action = ctx.input.action === 'create' ? 'created' : 'updated';

    return {
      output: {
        activityId: activity?.id,
        subject: activity?.subject,
        type: activity?.type,
        dueDate: activity?.due_date,
        dueTime: activity?.due_time,
        duration: activity?.duration,
        done: activity?.done,
        dealId: activity?.deal_id,
        personId: activity?.person_id,
        organizationId: activity?.org_id,
        addTime: activity?.add_time,
        updateTime: activity?.update_time
      },
      message: `Activity **"${activity?.subject}"** (ID: ${activity?.id}) has been ${action}.`
    };
  });
