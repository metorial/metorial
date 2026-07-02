import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let mapUser = (user: any) => ({
  userId: user.id,
  email: user.email || undefined,
  firstName: user.firstName || user.first_name || undefined,
  lastName: user.lastName || user.last_name || undefined,
  username: user.username || undefined,
  fullName: user.fullName || user.fullname || user.name || undefined
});

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description:
    'Lists ActiveCampaign account users. Use this to find owner, assignee, and list owner IDs for deals, tasks, and lists.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      currentUserOnly: z
        .boolean()
        .optional()
        .describe('When true, only return the authenticated API user')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.string(),
          email: z.string().optional(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          username: z.string().optional(),
          fullName: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    if (ctx.input.currentUserOnly) {
      let result = await client.getCurrentUser();
      let user = result.user || result;
      return {
        output: { users: [mapUser(user)] },
        message: 'Retrieved the current ActiveCampaign user.'
      };
    }

    let result = await client.listUsers();
    let users = (result.users || []).map(mapUser);

    return {
      output: { users },
      message: `Found **${users.length}** users.`
    };
  })
  .build();
