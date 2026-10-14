import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { siteIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let manageSchedules = SlateTool.create(spec, {
  name: 'Manage Schedules',
  key: 'manage_schedules',
  description: `List, create, or delete inspection schedules. Schedules automate recurring inspections by assigning templates to users on a defined cadence.`,
  instructions: [
    'To list schedules, set operation to "list". Optionally filter by templateId.',
    'To create, set operation to "create" and provide templateId, assigneeIds, frequency, startTime, startHour, startMinute, and duration. Occurrence times use the token owner profile timezone.',
    'Creation defaults to description "Scheduled inspection", one assignee completing each occurrence, and no late starts. Override with description, mustComplete, and canLateSubmit.',
    'To delete, set operation to "delete" and provide scheduleId.'
  ]
})
  .input(
    z.object({
      operation: z.enum(['list', 'create', 'delete']).describe('The operation to perform'),
      templateId: z
        .string()
        .optional()
        .describe('Template ID (for filtering list or creating a schedule)'),
      assigneeIds: z.array(z.string()).optional().describe('User IDs to assign (for create)'),
      frequency: z
        .string()
        .optional()
        .describe(
          'Schedule RRULE, for example FREQ=WEEKLY;BYDAY=MO;INTERVAL=1, or a cadence such as daily (for create).'
        ),
      description: z
        .string()
        .optional()
        .describe('Schedule description for create. Defaults to "Scheduled inspection".'),
      mustComplete: z
        .enum(['ONE', 'ALL'])
        .optional()
        .describe(
          'Who must complete each occurrence: ONE assignee (default) or ALL assignees.'
        ),
      canLateSubmit: z
        .boolean()
        .optional()
        .describe('Allow inspections to start after the due date. Defaults to false.'),
      startTime: z
        .string()
        .optional()
        .describe(
          'Required for create: when the schedule begins, in ISO 8601 format with a timezone.'
        ),
      startHour: z
        .number()
        .int()
        .min(0)
        .max(23)
        .optional()
        .describe(
          'Required for create: occurrence start hour in the token owner profile timezone. Provide with startMinute.'
        ),
      startMinute: z
        .number()
        .int()
        .min(0)
        .max(59)
        .optional()
        .describe('Required for create: occurrence start minute. Provide with startHour.'),
      duration: z
        .string()
        .optional()
        .describe(
          'Required for create: ISO 8601 duration of the completion window, for example PT1H.'
        ),
      toDate: z
        .string()
        .optional()
        .describe(
          'When the schedule ends, in ISO 8601 format with a timezone, later than startTime.'
        ),
      siteId: siteIdSchema.optional(),
      scheduleId: z.string().optional().describe('Schedule ID (for delete)'),
      pageSize: z.number().optional().describe('Page size for list'),
      pageToken: z.string().optional().describe('Page token for pagination')
    })
  )
  .output(
    z.object({
      schedules: z
        .array(z.any())
        .optional()
        .describe('List of schedules (for list operation)'),
      scheduleId: z.string().optional().describe('ID of created or deleted schedule'),
      nextPageToken: z.string().optional().describe('Token for next page'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    switch (ctx.input.operation) {
      case 'list': {
        let result = await client.listSchedules({
          templateId: ctx.input.templateId,
          pageSize: ctx.input.pageSize,
          pageToken: ctx.input.pageToken
        });
        return {
          output: {
            schedules: result.schedules,
            nextPageToken: result.nextPageToken,
            success: true
          },
          message: `Found **${result.schedules.length}** schedules.${result.nextPageToken ? ' More results available.' : ''}`
        };
      }
      case 'create': {
        if (!ctx.input.templateId)
          throw createApiServiceError('templateId is required for create');
        if (!ctx.input.assigneeIds || ctx.input.assigneeIds.length === 0)
          throw createApiServiceError('assigneeIds is required for create');
        if (!ctx.input.frequency)
          throw createApiServiceError('frequency is required for create');

        let result = await client.createSchedule({
          templateId: ctx.input.templateId,
          assigneeIds: ctx.input.assigneeIds,
          frequency: ctx.input.frequency,
          description: ctx.input.description,
          mustComplete: ctx.input.mustComplete,
          canLateSubmit: ctx.input.canLateSubmit,
          startTime: ctx.input.startTime,
          startHour: ctx.input.startHour,
          startMinute: ctx.input.startMinute,
          duration: ctx.input.duration,
          toDate: ctx.input.toDate,
          siteId: ctx.input.siteId
        });

        let id = result.id || result.schedule_item_id;
        return {
          output: { scheduleId: id, success: true },
          message: `Created schedule **${id}** for template ${ctx.input.templateId}.`
        };
      }
      case 'delete': {
        if (!ctx.input.scheduleId)
          throw createApiServiceError('scheduleId is required for delete');
        await client.deleteSchedule(ctx.input.scheduleId);
        return {
          output: { scheduleId: ctx.input.scheduleId, success: true },
          message: `Deleted schedule **${ctx.input.scheduleId}**.`
        };
      }
    }
  })
  .build();
