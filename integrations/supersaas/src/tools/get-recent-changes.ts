import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRecentChangesTool = SlateTool.create(spec, {
  name: 'Get Recent Changes',
  key: 'get_recent_changes',
  description: `Retrieve recent appointment changes on a schedule since a given date. Useful for syncing appointment data with external systems. Returns created, updated, and deleted appointments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      scheduleId: z.string().describe('Schedule ID to get changes for'),
      from: z
        .string()
        .optional()
        .describe(
          'Only return changes after this time (ISO format YYYY-MM-DD HH:MM:SS in UTC)'
        ),
      includeSlotInfo: z.boolean().optional().describe('Whether to include slot details'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      changes: z
        .array(
          z.object({
            appointmentId: z.string().optional().describe('Appointment ID'),
            start: z.string().optional().describe('Start date/time'),
            finish: z.string().optional().describe('End date/time'),
            resourceName: z.string().optional().describe('Resource name'),
            resourceId: z.string().optional().describe('Resource ID'),
            fullName: z.string().optional().describe('Booker full name'),
            email: z.string().optional().describe('Booker email'),
            userId: z.string().optional().describe('User ID'),
            status: z.string().optional().describe('Appointment status'),
            deleted: z.boolean().optional().describe('Whether appointment was deleted'),
            createdOn: z.string().optional().describe('UTC creation timestamp'),
            updatedOn: z.string().optional().describe('UTC last update timestamp')
          })
        )
        .describe('List of changed appointments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let data = await client.getRecentChanges(ctx.input.scheduleId, {
      from: ctx.input.from,
      slot: ctx.input.includeSlotInfo,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let changes = Array.isArray(data)
      ? data.map((item: any) => ({
          appointmentId: item.id != null ? String(item.id) : undefined,
          start: item.start ?? undefined,
          finish: item.finish ?? undefined,
          resourceName: item.resource ?? undefined,
          resourceId: item.resource_id != null ? String(item.resource_id) : undefined,
          fullName: item.full_name ?? undefined,
          email: item.email ?? undefined,
          userId: item.user_id != null ? String(item.user_id) : undefined,
          status: item.status ?? undefined,
          deleted: item.deleted ?? undefined,
          createdOn: item.created_on ?? undefined,
          updatedOn: item.updated_on ?? undefined
        }))
      : [];

    return {
      output: { changes },
      message: `Found **${changes.length}** change(s) on schedule **${ctx.input.scheduleId}**.`
    };
  })
  .build();
