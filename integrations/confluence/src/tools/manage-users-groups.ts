import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: `Retrieve the currently authenticated Confluence user's profile information.`,
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      accountId: z.string().optional(),
      displayName: z.string().optional(),
      email: z.string().optional(),
      accountType: z.string().optional(),
      profilePicturePath: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let user = await client.getCurrentUser();

    return {
      output: {
        accountId: user.accountId,
        displayName: user.displayName || user.publicName,
        email: user.email,
        accountType: user.accountType,
        profilePicturePath: user.profilePicture?.path
      },
      message: `Current user: **${user.displayName || user.publicName || 'Unknown'}**`
    };
  })
  .build();

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `List Confluence groups with pagination support.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z.number().optional().default(25).describe('Maximum number of groups to return'),
      start: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      groups: z.array(
        z.object({
          groupName: z.string(),
          groupId: z.string().optional()
        })
      ),
      totalSize: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let response = await client.getGroups({
      limit: ctx.input.limit,
      start: ctx.input.start
    });

    let groups = response.results.map(g => ({
      groupName: g.name,
      groupId: g.id
    }));

    return {
      output: { groups, totalSize: response.size },
      message: `Found **${groups.length}** groups`
    };
  })
  .build();
