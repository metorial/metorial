import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BartClient } from '../lib/client';
import { bartText } from '../lib/response';
import { spec } from '../spec';

export let getSystemStatus = SlateTool.create(spec, {
  name: 'Get System Status',
  key: 'get_system_status',
  description: `Get a quick overview of the BART system status including the number of trains currently active. Useful for checking whether the system is running and how busy it is.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      date: z.string().describe('Current date'),
      time: z.string().describe('Current time'),
      trainCount: z.string().describe('Number of trains currently active in the BART system')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BartClient({ token: ctx.auth.token });
    let result = await client.getTrainCount();
    let trainCount = bartText(result.traincount);
    if (!trainCount) {
      throw createApiServiceError(
        'BART did not return the active train count. Try again later.'
      );
    }
    return {
      output: { date: bartText(result.date), time: bartText(result.time), trainCount },
      message: `**${trainCount}** trains currently active in the BART system.`
    };
  })
  .build();
