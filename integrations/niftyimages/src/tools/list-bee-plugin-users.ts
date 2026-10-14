import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listBeePluginUsers = SlateTool.create(spec, {
  name: 'List Bee Plugin Users',
  key: 'list_bee_plugin_users',
  description:
    'List Bee Plugin users with image counts, opens, and suspension status for a date range. Use the returned UserName as userId when suspending a Bee Plugin user.',
  instructions: [
    'Provide the pluginKey from your Bee Plugin integration configuration. Dates and reporting use Pacific Standard Time; the default range is the last 30 days.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      pluginKey: z.string().describe('Bee Plugin key from your integration configuration.'),
      startDate: z
        .string()
        .optional()
        .describe('Start date in ISO 8601 format; defaults to 30 days ago.'),
      endDate: z
        .string()
        .optional()
        .describe('End date in ISO 8601 format; defaults to today.')
    })
  )
  .output(
    z.object({
      users: z.array(z.any()).describe('Users with UserName, Images, Opens, and Status.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let users = await client.getBeePluginUsers(ctx.input.pluginKey, {
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate
    });
    return {
      output: { users },
      message: `Retrieved **${users.length}** Bee Plugin user(s).`
    };
  })
  .build();
