import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  key: 'get_current_user',
  name: 'Get Current User',
  description:
    'Get the current Ayrshare profile identity and its linked social accounts. Uses the configured user profile when a Profile Key is set.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      refId: z.string().optional().describe('Stable Ayrshare profile reference ID'),
      title: z.string().optional().describe('Profile title'),
      email: z.string().optional().describe('Account email address, when returned'),
      activeSocialAccounts: z.array(z.string()).optional().describe('Linked social networks'),
      displayNames: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Linked social account IDs, names, and platform details')
    })
  )
  .handleInvocation(async ctx => {
    let user = await new Client({ ...ctx.auth, profileKey: ctx.config.profileKey }).getUser();
    return {
      output: {
        refId: user.refId,
        title: user.title ?? user.displayTitle,
        email: user.email,
        activeSocialAccounts: user.activeSocialAccounts,
        displayNames: user.displayNames
      },
      message: `Retrieved profile **${user.title ?? user.displayTitle ?? user.refId}**.`
    };
  })
  .build();
