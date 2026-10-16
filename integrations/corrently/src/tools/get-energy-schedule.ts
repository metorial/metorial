import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapSchedule, scheduleId, scheduleOutput } from '../lib/schedule';
import { spec } from '../spec';

export let getEnergySchedule = SlateTool.create(spec, {
  name: 'Get Energy Schedule',
  key: 'get_energy_schedule',
  description:
    'Retrieves an energy schedule, current device recommendation, time slots, and progress. Use the schedule ID returned by create_energy_schedule.',
  tags: { readOnly: true }
})
  .input(z.object({ scheduleId }))
  .output(scheduleOutput)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getSchedule(ctx.input.scheduleId);
    return { output: mapSchedule(result), message: 'Retrieved the energy schedule.' };
  })
  .build();
