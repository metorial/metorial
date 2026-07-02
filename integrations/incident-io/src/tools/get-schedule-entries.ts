import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

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
      entryWindowStart: z.string().describe('Start of the time window (ISO 8601 timestamp)'),
      entryWindowEnd: z.string().describe('End of the time window (ISO 8601 timestamp)')
    })
  )
  .output(
    z.object({
      entries: z.array(
        z.object({
          startAt: z.string(),
          endAt: z.string(),
          user: z.any().optional(),
          rotationId: z.string().optional(),
          layerId: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listScheduleEntries({
      scheduleId: ctx.input.scheduleId,
      entryWindowStart: ctx.input.entryWindowStart,
      entryWindowEnd: ctx.input.entryWindowEnd
    });

    let entries = (result.schedule_entries || []).map((e: any) => ({
      startAt: e.start_at,
      endAt: e.end_at,
      user: e.user || undefined,
      rotationId: e.rotation_id || undefined,
      layerId: e.layer_id || undefined
    }));

    return {
      output: { entries },
      message: `Found **${entries.length}** schedule entries for the given time window.`
    };
  })
  .build();
