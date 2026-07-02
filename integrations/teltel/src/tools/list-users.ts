import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelTelClient } from '../lib/client';
import { spec } from '../spec';

export let listUsersTool = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve all users associated with the TelTel account, including their SIP device details and individual API keys.
Useful for mapping CRM users to TelTel users when integrating the webphone, or for discovering available agents.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      users: z
        .array(z.any())
        .describe('List of user objects with SIP device details and API keys')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelTelClient(ctx.auth.token);

    let result = await client.listUsers();
    let users = Array.isArray(result) ? result : [];

    return {
      output: {
        users
      },
      message: `Retrieved **${users.length}** user(s).`
    };
  })
  .build();
