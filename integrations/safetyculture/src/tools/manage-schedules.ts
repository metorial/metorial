import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSchedules = SlateTool.create(spec, {
  name: 'Manage Schedules',
  key: 'manage_schedules',
  description: `List, create, or delete inspection schedules. Schedules automate recurring inspections by assigning templates to users on a defined cadence.`,
  instructions: [
    'To list schedules, set operation to "list". Optionally filter by templateId.',
    'To create, set operation to "create" and provide templateId, assigneeIds, and frequency.',
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
      frequency: z.string().optional().describe('Schedule frequency/cadence (for create)'),
      startTime: z.string().optional().describe('Start time in ISO 8601 format (for create)'),
      siteId: z.string().optional().describe('Site ID (for create)'),
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
        if (!ctx.input.templateId) throw new Error('templateId is required for create');
        if (!ctx.input.assigneeIds || ctx.input.assigneeIds.length === 0)
          throw new Error('assigneeIds is required for create');
        if (!ctx.input.frequency) throw new Error('frequency is required for create');

        let result = await client.createSchedule({
          templateId: ctx.input.templateId,
          assigneeIds: ctx.input.assigneeIds,
          frequency: ctx.input.frequency,
          startTime: ctx.input.startTime,
          siteId: ctx.input.siteId
        });

        let id = result.id || result.schedule_item_id;
        return {
          output: { scheduleId: id, success: true },
          message: `Created schedule **${id}** for template ${ctx.input.templateId}.`
        };
      }
      case 'delete': {
        if (!ctx.input.scheduleId) throw new Error('scheduleId is required for delete');
        await client.deleteSchedule(ctx.input.scheduleId);
        return {
          output: { scheduleId: ctx.input.scheduleId, success: true },
          message: `Deleted schedule **${ctx.input.scheduleId}**.`
        };
      }
    }
  })
  .build();
