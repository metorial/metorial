import { SlateTool } from 'slates';
import { z } from 'zod';
import { createSplunkClient } from '../lib/helpers';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List Splunk users on the instance. Returns username, real name, email, assigned roles, and default app. Supports pagination.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      count: z.number().optional().describe('Number of users to return (default 30)'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          username: z.string().optional(),
          realname: z.string().optional(),
          email: z.string().optional(),
          roles: z.array(z.string()).optional(),
          defaultApp: z.string().optional(),
          type: z.string().optional(),
          lastSuccessfulLogin: z.string().optional()
        })
      ),
      total: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = createSplunkClient(ctx);
    let response = await client.listUsers({
      count: ctx.input.count,
      offset: ctx.input.offset
    });

    return {
      output: response,
      message: `Found **${response.total}** users. Returned **${response.users.length}**.`
    };
  })
  .build();

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: `Get information about the currently authenticated Splunk user, including username, roles, and capabilities.`,
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      username: z.string().optional(),
      realname: z.string().optional(),
      roles: z.array(z.string()).optional(),
      capabilities: z.array(z.string()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createSplunkClient(ctx);
    let result = await client.getCurrentUser();

    return {
      output: result,
      message: `Current user: **${result.username}** with roles: ${(result.roles || []).join(', ')}.`
    };
  })
  .build();
