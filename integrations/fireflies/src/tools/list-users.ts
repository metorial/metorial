import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirefliesClient } from '../lib/client';
import { spec } from '../spec';
import { mapUser, userSchema } from './shared';

export let listUsers = SlateTool.create(spec, {
  name: 'List Team Members',
  key: 'list_users',
  description: `Retrieve all team members with their profile information including name, email, role, connected integrations, transcript count, minutes consumed, calendar sync status, and user groups.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      users: z.array(userSchema).describe('List of team members')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirefliesClient({ token: ctx.auth.token });
    let users = await client.getUsers();
    let mapped = (users || []).map((user: any) => mapUser(user));

    return {
      output: { users: mapped },
      message: `Found **${mapped.length}** team member(s).`
    };
  })
  .build();
