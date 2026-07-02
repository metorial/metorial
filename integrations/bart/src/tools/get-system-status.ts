import { SlateTool } from 'slates';
import { z } from 'zod';
import { BartClient } from '../lib/client';
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

    return {
      output: {
        date: result?.date || '',
        time: result?.time || '',
        trainCount: result?.traincount || '0'
      },
      message: `**${result?.traincount || '0'}** trains currently active in the BART system.`
    };
  })
  .build();
