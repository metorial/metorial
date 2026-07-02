import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { checkSchema } from '../lib/types';
import { spec } from '../spec';

export let getCheck = SlateTool.create(spec, {
  name: 'Get Check',
  key: 'get_check',
  description: `Retrieve detailed information about a specific uptime monitoring check, including its current status, URL, uptime percentage, configuration, and SSL certificate details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      checkToken: z.string().describe('The unique token identifier of the check to retrieve')
    })
  )
  .output(checkSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let check = await client.getCheck(ctx.input.checkToken);

    let status = check.down ? '🔴 Down' : '🟢 Up';
    return {
      output: check,
      message: `Check **${check.alias || check.url}** is ${status} with **${check.uptime}%** uptime.`
    };
  })
  .build();
