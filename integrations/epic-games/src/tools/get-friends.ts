import { SlateTool } from 'slates';
import { z } from 'zod';
import { EosAccountServicesClient } from '../lib/client';
import { spec } from '../spec';

let friendSchema = z.object({
  accountId: z.string().describe("Friend's Epic Games account ID"),
  created: z.string().describe('When the friendship was created (ISO 8601)'),
  favorite: z.boolean().optional().describe('Whether this friend is marked as a favorite'),
  nickname: z.string().optional().describe('Custom nickname set for this friend')
});

let blockedUserSchema = z.object({
  accountId: z.string().describe("Blocked user's Epic Games account ID"),
  created: z.string().describe('When the user was blocked (ISO 8601)')
});

export let getFriends = SlateTool.create(spec, {
  name: 'Get Friends & Block List',
  key: 'get_friends',
  description: `Retrieve a player's friends list and/or block list. Can return both lists together or individually.
Requires the **friends_list** scope via OAuth authentication. The authenticated user can only query their own friends and block list.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: z
        .string()
        .describe('Epic Games account ID to query. Must match the authenticated user.'),
      include: z
        .enum(['all', 'friends', 'blocklist'])
        .default('all')
        .describe('Which lists to include in the response')
    })
  )
  .output(
    z.object({
      friends: z.array(friendSchema).optional().describe('List of friends'),
      blockList: z.array(blockedUserSchema).optional().describe('List of blocked users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EosAccountServicesClient({
      token: ctx.auth.token,
      accountId: ctx.auth.accountId
    });

    if (ctx.input.include === 'friends') {
      let data = await client.getFriends(ctx.input.accountId);
      let friends = Array.isArray(data) ? data : [data];
      return {
        output: { friends },
        message: `Retrieved **${friends.length}** friend(s).`
      };
    }

    if (ctx.input.include === 'blocklist') {
      let data = await client.getBlockList(ctx.input.accountId);
      let blockList = Array.isArray(data) ? data : [data];
      return {
        output: { blockList },
        message: `Retrieved **${blockList.length}** blocked user(s).`
      };
    }

    let data = await client.getFriendsAndBlockList(ctx.input.accountId);
    return {
      output: {
        friends: data.friends ?? [],
        blockList: data.blockList ?? []
      },
      message: `Retrieved **${(data.friends ?? []).length}** friend(s) and **${(data.blockList ?? []).length}** blocked user(s).`
    };
  })
  .build();
