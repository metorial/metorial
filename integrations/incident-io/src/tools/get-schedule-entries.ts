import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

const entrySchema = z.object({
  startAt: z.string(),
  endAt: z.string(),
  user: z.any().optional(),
  rotationId: z.string().optional(),
  layerId: z.string().optional(),
  entryId: z.string().optional()
});

export let getScheduleEntries = SlateTool.create(spec, {
  name: 'Get Schedule Entries',
  key: 'get_schedule_entries',
  description: `Retrieve on-call schedule entries for a given time window. Shows who is on-call during each period, useful for understanding coverage and identifying who is responsible at a given time.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      scheduleId: z.string().describe('ID of the schedule to query'),
      entryWindowStart: z
        .string()
        .describe('Start timestamp, or the nextCursor from the previous response'),
      entryWindowEnd: z.string().describe('End of the time window (ISO 8601 timestamp)')
    })
  )
  .output(
    z.object({
      entries: z.array(entrySchema),
      scheduled: z.array(entrySchema),
      overrides: z.array(entrySchema),
      nextCursor: z
        .string()
        .optional()
        .describe('Pass as entryWindowStart for the next page; keep entryWindowEnd unchanged'),
      returnedCount: z.number().int().nonnegative()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listScheduleEntries({
      scheduleId: ctx.input.scheduleId,
      entryWindowStart: ctx.input.entryWindowStart,
      entryWindowEnd: ctx.input.entryWindowEnd
    });

    const mapEntry = (e: (typeof result.schedule_entries.final)[number]) => ({
      startAt: e.start_at,
      endAt: e.end_at,
      user: e.user ?? undefined,
      rotationId: e.rotation_id,
      entryId: e.entry_id
    });
    const entries = result.schedule_entries.final.map(mapEntry);
    return {
      output: {
        entries,
        scheduled: result.schedule_entries.scheduled.map(mapEntry),
        overrides: result.schedule_entries.overrides.map(mapEntry),
        nextCursor: result.pagination_meta?.after,
        returnedCount: entries.length
      },
      message: `Found **${entries.length}** schedule entries for the given time window.`
    };
  })
  .build();
