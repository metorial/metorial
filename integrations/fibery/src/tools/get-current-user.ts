import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUserTool = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: 'Get the ID and name of the user authenticated by the connected API token.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ userId: z.string(), name: z.string() }))
  .handleInvocation(async ctx => {
    let client = new Client({
      accountName: ctx.config.accountName,
      token: ctx.auth.token
    });
    let result = await client.executeCommand({
      command: 'fibery.entity/query',
      args: {
        query: {
          'q/from': 'fibery/user',
          'q/select': ['fibery/id', 'user/name'],
          'q/where': ['=', ['fibery/id'], '$my-id'],
          'q/limit': 1
        }
      }
    });
    let user = Array.isArray(result.result) ? result.result[0] : undefined;
    if (
      !user ||
      typeof user['fibery/id'] !== 'string' ||
      typeof user['user/name'] !== 'string'
    ) {
      throw createApiServiceError('Fibery did not return the authenticated user.');
    }
    return {
      output: { userId: user['fibery/id'], name: user['user/name'] },
      message: `Authenticated as **${user['user/name']}**.`
    };
  })
  .build();
