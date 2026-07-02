import { SlateTool } from 'slates';
import { z } from 'zod';
import { MgmtClient } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Lists all users in the Agility CMS instance. Returns user details including roles and permissions. Requires OAuth authentication.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      users: z.array(z.record(z.string(), z.any())).describe('Array of user objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MgmtClient({
      token: ctx.auth.token,
      guid: ctx.config.guid,
      locale: ctx.config.locale,
      region: ctx.auth.region
    });

    let result = await client.listUsers();
    let users = Array.isArray(result) ? result : [];

    return {
      output: { users },
      message: `Retrieved **${users.length}** user(s)`
    };
  })
  .build();
