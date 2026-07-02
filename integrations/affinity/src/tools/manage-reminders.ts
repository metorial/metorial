import { SlateTool } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

let reminderSchema = z.object({
  reminderId: z.number().describe('Unique identifier of the reminder'),
  ownerId: z.number().describe('ID of the reminder owner'),
  personId: z.number().nullable().describe('ID of the associated person'),
  organizationId: z.number().nullable().describe('ID of the associated organization'),
  opportunityId: z.number().nullable().describe('ID of the associated opportunity'),
  content: z.string().nullable().describe('Reminder text'),
  dueDate: z.string().nullable().describe('When the reminder is due'),
  status: z.number().nullable().describe('Reminder status (0=active, 1=completed)'),
  type: z.number().nullable().describe('Reminder type (0=one-time, 1=recurring)'),
  resetType: z
    .number()
    .nullable()
    .describe('Recurring reset type (0=none, 1=email, 2=meeting, 3=any interaction)'),
  createdAt: z.string().nullable().describe('Creation timestamp')
});

export let listReminders = SlateTool.create(spec, {
  name: 'List Reminders',
  key: 'list_reminders',
  description: `Retrieve reminders from Affinity, optionally filtered by entity or owner. Supports one-time and recurring reminders that can auto-reset based on interaction activity.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      personId: z.number().optional().describe('Filter reminders for this person'),
      organizationId: z.number().optional().describe('Filter reminders for this organization'),
      opportunityId: z.number().optional().describe('Filter reminders for this opportunity'),
      ownerId: z.number().optional().describe('Filter reminders by owner'),
      pageSize: z.number().optional().describe('Number of results per page'),
      pageToken: z.string().optional().describe('Token for fetching the next page')
    })
  )
  .output(
    z.object({
      reminders: z.array(reminderSchema).describe('List of reminders'),
      nextPageToken: z.string().nullable().describe('Token for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    let result = await client.listReminders({
      personId: ctx.input.personId,
      organizationId: ctx.input.organizationId,
      opportunityId: ctx.input.opportunityId,
      ownerId: ctx.input.ownerId,
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    let reminders = (result.reminders ?? result ?? []).map((r: any) => ({
      reminderId: r.id,
      ownerId: r.owner_id,
      personId: r.person_id ?? null,
      organizationId: r.organization_id ?? null,
      opportunityId: r.opportunity_id ?? null,
      content: r.content ?? null,
      dueDate: r.due_date ?? null,
      status: r.status ?? null,
      type: r.type ?? null,
      resetType: r.reset_type ?? null,
      createdAt: r.created_at ?? null
    }));

    return {
      output: {
        reminders,
        nextPageToken: result.next_page_token ?? null
      },
      message: `Retrieved **${reminders.length}** reminder(s).`
    };
  })
  .build();

export let createReminder = SlateTool.create(spec, {
  name: 'Create Reminder',
  key: 'create_reminder',
  description: `Create a new reminder in Affinity, attached to a person, organization, or opportunity. Supports one-time and recurring reminders.

**Reminder types:** 0 = one-time, 1 = recurring
**Reset types (for recurring):** 0 = none, 1 = on email, 2 = on meeting, 3 = on any interaction`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      content: z.string().describe('Reminder text'),
      ownerId: z.number().describe('ID of the user who owns this reminder'),
      dueDate: z.string().describe('Due date (ISO 8601 format)'),
      personId: z.number().optional().describe('ID of the person to associate with'),
      organizationId: z
        .number()
        .optional()
        .describe('ID of the organization to associate with'),
      opportunityId: z.number().optional().describe('ID of the opportunity to associate with'),
      type: z.number().optional().describe('Reminder type (0=one-time, 1=recurring)'),
      resetType: z
        .number()
        .optional()
        .describe('Reset trigger for recurring reminders (0=none, 1=email, 2=meeting, 3=any)')
    })
  )
  .output(reminderSchema)
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    let r = await client.createReminder({
      content: ctx.input.content,
      ownerId: ctx.input.ownerId,
      dueDate: ctx.input.dueDate,
      personId: ctx.input.personId,
      organizationId: ctx.input.organizationId,
      opportunityId: ctx.input.opportunityId,
      type: ctx.input.type,
      resetType: ctx.input.resetType
    });

    return {
      output: {
        reminderId: r.id,
        ownerId: r.owner_id,
        personId: r.person_id ?? null,
        organizationId: r.organization_id ?? null,
        opportunityId: r.opportunity_id ?? null,
        content: r.content ?? null,
        dueDate: r.due_date ?? null,
        status: r.status ?? null,
        type: r.type ?? null,
        resetType: r.reset_type ?? null,
        createdAt: r.created_at ?? null
      },
      message: `Created reminder (ID: ${r.id}) due on ${r.due_date}.`
    };
  })
  .build();

export let updateReminder = SlateTool.create(spec, {
  name: 'Update Reminder',
  key: 'update_reminder',
  description: `Update an existing reminder in Affinity. Provide only the fields you want to change.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      reminderId: z.number().describe('ID of the reminder to update'),
      content: z.string().optional().describe('New reminder text'),
      dueDate: z.string().optional().describe('New due date (ISO 8601 format)'),
      status: z.number().optional().describe('New status (0=active, 1=completed)'),
      type: z.number().optional().describe('New reminder type (0=one-time, 1=recurring)'),
      resetType: z.number().optional().describe('New reset type for recurring')
    })
  )
  .output(reminderSchema)
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    let r = await client.updateReminder(ctx.input.reminderId, {
      content: ctx.input.content,
      dueDate: ctx.input.dueDate,
      status: ctx.input.status,
      type: ctx.input.type,
      resetType: ctx.input.resetType
    });

    return {
      output: {
        reminderId: r.id,
        ownerId: r.owner_id,
        personId: r.person_id ?? null,
        organizationId: r.organization_id ?? null,
        opportunityId: r.opportunity_id ?? null,
        content: r.content ?? null,
        dueDate: r.due_date ?? null,
        status: r.status ?? null,
        type: r.type ?? null,
        resetType: r.reset_type ?? null,
        createdAt: r.created_at ?? null
      },
      message: `Updated reminder (ID: ${r.id}).`
    };
  })
  .build();

export let deleteReminder = SlateTool.create(spec, {
  name: 'Delete Reminder',
  key: 'delete_reminder',
  description: `Permanently delete a reminder from Affinity.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      reminderId: z.number().describe('ID of the reminder to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    await client.deleteReminder(ctx.input.reminderId);

    return {
      output: { success: true },
      message: `Deleted reminder with ID **${ctx.input.reminderId}**.`
    };
  })
  .build();
