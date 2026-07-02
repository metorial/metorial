import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let invalidateGroupTokens = SlateTool.create(spec, {
  name: 'Invalidate Group Tokens',
  key: 'invalidate_group_tokens',
  description: `Rotate tokens for a group, invalidating all existing group auth tokens. Any clients using old tokens will need to obtain new ones.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      groupName: z.string().describe('Name of the group to rotate tokens for')
    })
  )
  .output(
    z.object({
      groupName: z.string().describe('Name of the group whose tokens were invalidated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationSlug: ctx.config.organizationSlug
    });

    await client.invalidateGroupTokens(ctx.input.groupName);

    return {
      output: {
        groupName: ctx.input.groupName
      },
      message: `Invalidated all tokens for group **${ctx.input.groupName}**.`
    };
  })
  .build();
