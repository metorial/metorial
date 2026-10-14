import { SlateTool } from 'slates';
import { z } from 'zod';
import { createTimelyClient } from '../lib/client';
import { accountIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getTimeEntry = SlateTool.create(spec, {
  name: 'Get Time Entry',
  key: 'get_time_entry',
  description:
    'Retrieve one Timely time entry by ID, including its project, user, duration, and billing state. Call list_accounts to discover workspace IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      accountId: accountIdSchema,
      eventId: z.string().describe('Time entry ID from list_time_entries or create_time_entry')
    })
  )
  .output(
    z.object({
      eventId: z.number(),
      day: z.string(),
      note: z.string().nullable(),
      projectId: z.number().nullable(),
      projectName: z.string().nullable(),
      userId: z.number().nullable(),
      userName: z.string().nullable(),
      durationFormatted: z.string().nullable(),
      externalId: z.string().nullable(),
      labelIds: z.array(z.number()),
      billed: z.boolean(),
      billable: z.boolean(),
      timerState: z.string().nullable(),
      locked: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let event = await (await createTimelyClient(ctx)).getEvent(ctx.input.eventId);
    return {
      output: {
        eventId: event.id,
        day: event.day,
        note: event.note ?? null,
        projectId: event.project?.id ?? null,
        projectName: event.project?.name ?? null,
        userId: event.user?.id ?? null,
        userName: event.user?.name ?? null,
        durationFormatted: event.duration?.formatted ?? null,
        externalId: event.external_id ?? null,
        labelIds: event.label_ids ?? [],
        billed: event.billed ?? false,
        billable: event.billable ?? true,
        timerState: event.timer_state ?? null,
        locked: event.locked ?? false
      },
      message: `Retrieved time entry #${event.id} on ${event.day}.`
    };
  })
  .build();
