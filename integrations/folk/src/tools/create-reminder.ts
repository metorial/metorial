import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createReminder = SlateTool.create(spec, {
  name: 'Create Reminder',
  key: 'create_reminder',
  description: `Creates a new reminder associated with a person, company, or deal. Reminders use iCalendar recurrence rules (DTSTART + RRULE) for scheduling and can be assigned to specific users.`,
  instructions: [
    'The recurrenceRule must follow iCalendar format with DTSTART and RRULE, e.g. "DTSTART:20250101T090000Z\\nRRULE:FREQ=WEEKLY;INTERVAL=1".',
    'Public reminders require at least one assigned user.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      entityId: z.string().describe('ID of the person, company, or deal'),
      name: z.string().describe('Reminder title'),
      recurrenceRule: z.string().describe('iCalendar recurrence rule (DTSTART + RRULE)'),
      visibility: z.enum(['public', 'private']).describe('Reminder visibility'),
      assignedUsers: z
        .array(
          z.object({
            userId: z.string().optional().describe('User ID'),
            userEmail: z.string().optional().describe('User email')
          })
        )
        .optional()
        .describe('Users to assign (required for public reminders)')
    })
  )
  .output(
    z.object({
      reminderId: z.string().describe('ID of the created reminder'),
      name: z.string().describe('Reminder name'),
      entityId: z.string().describe('Associated entity ID'),
      entityType: z.string().describe('Entity type'),
      recurrenceRule: z.string().describe('Recurrence rule'),
      visibility: z.string().describe('Visibility'),
      nextTriggerTime: z.string().nullable().describe('Next trigger time'),
      assignedUsers: z
        .array(
          z.object({
            userId: z.string(),
            userName: z.string(),
            userEmail: z.string()
          })
        )
        .describe('Assigned users'),
      createdAt: z.string().nullable().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let input: {
      entity: { id: string };
      name: string;
      recurrenceRule: string;
      visibility: 'public' | 'private';
      assignedUsers?: Array<{ id?: string; email?: string }>;
    } = {
      entity: { id: ctx.input.entityId },
      name: ctx.input.name,
      recurrenceRule: ctx.input.recurrenceRule,
      visibility: ctx.input.visibility
    };

    if (ctx.input.assignedUsers) {
      input.assignedUsers = ctx.input.assignedUsers.map(u => {
        if (u.userId) return { id: u.userId };
        return { email: u.userEmail };
      });
    }

    let reminder = await client.createReminder(input);

    return {
      output: {
        reminderId: reminder.id,
        name: reminder.name,
        entityId: reminder.entity.id,
        entityType: reminder.entity.entityType,
        recurrenceRule: reminder.recurrenceRule,
        visibility: reminder.visibility,
        nextTriggerTime: reminder.nextTriggerTime,
        assignedUsers: reminder.assignedUsers.map(u => ({
          userId: u.id,
          userName: u.fullName,
          userEmail: u.email
        })),
        createdAt: reminder.createdAt
      },
      message: `Created reminder **${reminder.name}** for ${reminder.entity.entityType} **${reminder.entity.fullName}**`
    };
  })
  .build();
