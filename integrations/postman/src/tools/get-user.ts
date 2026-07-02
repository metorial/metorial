import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUserTool = SlateTool.create(spec, {
  name: 'Get Authenticated User',
  key: 'get_user',
  description: `Retrieve information about the authenticated Postman user, including profile details and current API usage limits (mock usage, monitor request runs, API usage).`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.number(),
      username: z.string().optional(),
      email: z.string().optional(),
      fullName: z.string().optional(),
      avatar: z.string().optional(),
      isPublic: z.boolean().optional(),
      operations: z
        .array(
          z.object({
            name: z.string(),
            limit: z.number().optional(),
            usage: z.number().optional(),
            overage: z.number().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.getAuthenticatedUser();
    let user = data.user;

    return {
      output: {
        userId: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        avatar: user.avatar,
        isPublic: user.isPublic,
        operations: data.operations?.map((op: any) => ({
          name: op.name,
          limit: op.limit,
          usage: op.usage,
          overage: op.overage
        }))
      },
      message: `Authenticated as **${user.fullName ?? user.username}** (${user.email}).`
    };
  })
  .build();
