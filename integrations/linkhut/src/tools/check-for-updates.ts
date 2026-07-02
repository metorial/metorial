import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkForUpdates = SlateTool.create(spec, {
  name: 'Check for Updates',
  key: 'check_for_updates',
  description: `Check the timestamp of the most recent bookmark modification. Use this before performing a full data sync to determine if any changes have occurred since the last check, avoiding unnecessary API calls.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      updateTime: z
        .string()
        .describe('ISO 8601 timestamp of the most recent bookmark modification')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getLastUpdate();

    return {
      output: result,
      message: `Last bookmark update: **${result.updateTime}**`
    };
  })
  .build();
