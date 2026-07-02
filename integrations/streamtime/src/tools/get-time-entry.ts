import { SlateTool } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
import { spec } from '../spec';

export let getTimeEntry = SlateTool.create(spec, {
  name: 'Get Time Entry',
  key: 'get_time_entry',
  description: `Retrieve a specific logged time entry by its ID, including all details such as hours, date, user, and associated job item.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      loggedTimeId: z.number().describe('ID of the time entry to retrieve')
    })
  )
  .output(
    z.object({
      loggedTimeId: z.number().describe('ID of the time entry'),
      raw: z.record(z.string(), z.any()).describe('Full time entry object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StreamtimeClient({ token: ctx.auth.token });

    let entry = await client.getLoggedTime(ctx.input.loggedTimeId);

    return {
      output: {
        loggedTimeId: entry.id,
        raw: entry
      },
      message: `Retrieved time entry (ID: ${entry.id}).`
    };
  })
  .build();
