import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { checkSchema } from '../lib/types';
import { spec } from '../spec';

export let listChecks = SlateTool.create(spec, {
  name: 'List Checks',
  key: 'list_checks',
  description: `List all uptime monitoring checks configured in your Updown.io account. Returns each check's current status, URL, uptime percentage, configuration, and SSL information.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      checks: z.array(checkSchema).describe('List of all monitoring checks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let checks = await client.listChecks();

    return {
      output: { checks },
      message: `Found **${checks.length}** monitoring check(s). ${checks.filter(c => c.down).length} currently down.`
    };
  })
  .build();
