import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getActivityData = SlateTool.create(spec, {
  name: 'Get Activity Data',
  key: 'get_activity_data',
  description: `Checks whether an email inbox has been active recently by looking at opens, clicks, forwards, and unsubscribes within the last 30 to 365+ days.
Useful for determining if an email address is currently active before sending campaigns, filtering out stale contacts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('The email address to check activity for')
    })
  )
  .output(
    z.object({
      found: z.boolean().describe('Whether activity data was found for the email'),
      activeInDays: z
        .string()
        .nullable()
        .describe(
          'Number of days since the email was last active (e.g. "30", "60", "90", "180", "365", or "365+"). Null if no activity data found.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    ctx.info(`Checking activity data for: ${ctx.input.email}`);
    let result = await client.getActivityData(ctx.input.email);

    let output = {
      found: Boolean(result.found),
      activeInDays: result.active_in_days as string | null
    };

    if (output.found && output.activeInDays) {
      return {
        output,
        message: `Email **${ctx.input.email}** was active in the last **${output.activeInDays} days**.`
      };
    } else {
      return {
        output,
        message: `No activity data found for **${ctx.input.email}**.`
      };
    }
  })
  .build();
