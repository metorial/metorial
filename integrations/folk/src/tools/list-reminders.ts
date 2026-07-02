import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listReminders = SlateTool.create(spec, {
  name: 'List Reminders',
  key: 'list_reminders',
  description: `Lists reminders for a specific person, company, or deal. Returns reminder names, schedules, assigned users, and trigger times.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      entityId: z
        .string()
        .describe('ID of the person, company, or deal to list reminders for'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of results per page (1-100, default 20)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      reminders: z
        .array(
          z.object({
            reminderId: z.string(),
            name: z.string(),
            recurrenceRule: z.string(),
            visibility: z.string(),
            nextTriggerTime: z.string().nullable(),
            lastTriggerTime: z.string().nullable(),
            assignedUsers: z.array(
              z.object({
                userId: z.string(),
                userName: z.string(),
                userEmail: z.string()
              })
            )
          })
        )
        .describe('List of reminders'),
      nextCursor: z.string().nullable().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listReminders(ctx.input.entityId, {
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let nextCursor: string | null = null;
    if (result.pagination.nextLink) {
      let url = new URL(result.pagination.nextLink);
      nextCursor = url.searchParams.get('cursor');
    }

    return {
      output: {
        reminders: result.items.map(r => ({
          reminderId: r.id,
          name: r.name,
          recurrenceRule: r.recurrenceRule,
          visibility: r.visibility,
          nextTriggerTime: r.nextTriggerTime,
          lastTriggerTime: r.lastTriggerTime,
          assignedUsers: r.assignedUsers.map(u => ({
            userId: u.id,
            userName: u.fullName,
            userEmail: u.email
          }))
        })),
        nextCursor
      },
      message: `Found **${result.items.length}** reminders${nextCursor ? ' (more available)' : ''}`
    };
  })
  .build();
