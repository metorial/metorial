import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteNonWorkingTime = SlateTool.create(spec, {
  name: 'Delete Non-Working Time',
  key: 'delete_non_working_time',
  description:
    'Delete a calendar absence to restore booking availability for that period. Call list_non_working_times to find the absence ID.',
  tags: { destructive: true }
})
  .input(
    z.object({
      nonWorkingTimeId: z.string().min(1).describe('Absence ID from list_non_working_times')
    })
  )
  .output(
    z.object({
      result: z.record(z.string(), z.any()).describe('API response for the deleted absence')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let result = await client.deleteNonWorkingTime(ctx.input.nonWorkingTimeId);
    return {
      output: { result },
      message: `Absence **${ctx.input.nonWorkingTimeId}** deleted.`
    };
  })
  .build();
