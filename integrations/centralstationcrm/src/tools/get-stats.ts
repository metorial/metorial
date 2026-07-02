import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getStats = SlateTool.create(spec, {
  name: 'Get Statistics',
  key: 'get_stats',
  description: `Retrieve statistics from CentralStationCRM including counts and sums for various CRM objects such as people, companies, deals, and more.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      type: z
        .string()
        .optional()
        .describe('Type of stats to retrieve (e.g., "deals", "people")')
    })
  )
  .output(
    z.object({
      stats: z.any().describe('Statistics data returned by the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    let result = await client.getStats({
      type: ctx.input.type
    });

    return {
      output: {
        stats: result
      },
      message: `Retrieved CRM statistics${ctx.input.type ? ` for **${ctx.input.type}**` : ''}.`
    };
  })
  .build();
