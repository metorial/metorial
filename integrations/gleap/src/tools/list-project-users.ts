import { SlateTool } from 'slates';
import { z } from 'zod';
import { GleapClient } from '../lib/client';
import { spec } from '../spec';

export let listProjectUsers = SlateTool.create(spec, {
  name: 'List Project Users',
  key: 'list_project_users',
  description:
    'List teammates who can access the connected project, including project and organization members. Use their IDs to assign tickets or team membership. Service accounts are excluded by the provider.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ users: z.array(z.record(z.string(), z.any())) }))
  .handleInvocation(async ctx => {
    let client = new GleapClient({
      token: ctx.auth.token,
      projectId: ctx.auth.projectId,
      region: ctx.auth.region
    });
    let users = await client.listProjectUsers();
    return {
      output: { users },
      message: `Retrieved **${users.length}** project users.`
    };
  })
  .build();
