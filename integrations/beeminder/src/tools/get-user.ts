import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeeminderClient } from '../lib/client';
import { mapUser, userSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve the authenticated user's profile information including timezone, account status, and urgency load.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      diffSince: z
        .number()
        .optional()
        .describe('Return goals and datapoints updated since this Unix timestamp'),
      skinny: z
        .boolean()
        .optional()
        .describe('With diffSince, return fewer goal attributes and only the last datapoint'),
      associations: z
        .boolean()
        .optional()
        .describe('Include all goals and datapoints; use sparingly'),
      emaciated: z.boolean().optional().describe('Omit road matrices from associated goals'),
      datapointsCount: z
        .number()
        .optional()
        .describe('Maximum most recently updated datapoints per goal')
    })
  )
  .output(userSchema)
  .handleInvocation(async ctx => {
    let client = new BeeminderClient({
      token: ctx.auth.token,
      username: ctx.auth.username,
      authType: ctx.auth.authType
    });

    let raw = await client.getUser(ctx.input);
    let user = mapUser(raw);

    return {
      output: user,
      message: `Retrieved profile for user **${user.username}**${user.timezone ? ` (timezone: ${user.timezone})` : ''}.`
    };
  })
  .build();
