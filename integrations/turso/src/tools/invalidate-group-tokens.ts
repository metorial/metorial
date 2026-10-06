import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientForContext } from '../lib/client';
import { spec } from '../spec';

export let invalidateGroupTokens = SlateTool.create(spec, {
  name: 'Invalidate Group Tokens',
  key: 'invalidate_group_tokens',
  description: `Choose an organization with list_organizations. Rotate the group signing key, invalidating existing SQL credentials for every database in the group. Applications using old database or group SQL tokens must obtain new credentials. This requires the separate group rotation permission.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      organizationSlug: z
        .string()
        .optional()
        .describe(
          'Organization slug. Call list_organizations to discover authorized organizations; older connections may use their saved organization.'
        ),
      groupName: z.string().describe('Name of the group to rotate tokens for')
    })
  )
  .output(
    z.object({
      groupName: z.string().describe('Name of the group whose tokens were invalidated')
    })
  )
  .handleInvocation(async ctx => {
    const client = clientForContext(ctx);

    await client.invalidateGroupTokens(ctx.input.groupName);

    return {
      output: {
        groupName: ctx.input.groupName
      },
      message: `Invalidated all tokens for group **${ctx.input.groupName}**.`
    };
  })
  .build();
