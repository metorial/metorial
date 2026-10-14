import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUserTool = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve the identity of the authenticated Doodle user for an existing Enterprise API connection.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      id: z.string().describe('Unique identifier of the authenticated user'),
      name: z.string().describe('Name of the authenticated user'),
      emailAddress: z.string().optional().describe('Email address when available')
    })
  )
  .handleInvocation(async ctx => {
    let user = await new Client({ token: ctx.auth.token }).getCurrentUser();
    return {
      output: user,
      message: `Authenticated as **${user.name}** (\`${user.id}\`).`
    };
  })
  .build();
