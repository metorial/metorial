import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addFriend = SlateTool.create(spec, {
  name: 'Add Friend',
  key: 'add_friend',
  description: `Add one or more friends to the authenticated user's Splitwise account by email address. Non-Splitwise users will receive an invitation.`
})
  .input(
    z.object({
      friends: z
        .array(
          z.object({
            email: z.string().describe('Email address of the person to add'),
            firstName: z
              .string()
              .optional()
              .describe('First name (recommended for new users)'),
            lastName: z.string().optional().describe('Last name')
          })
        )
        .min(1)
        .describe('Friends to add')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      addedUsers: z
        .array(
          z.object({
            userId: z.number().optional().describe('User ID of the added friend'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().nullable().optional().describe('Last name'),
            email: z.string().optional().describe('Email')
          })
        )
        .optional()
        .describe('Details of added friends')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.friends.length === 1) {
      let f = ctx.input.friends[0]!;
      let result = await client.addFriend(f.email, f.firstName, f.lastName);

      let addedUsers =
        result.friends?.map((friend: any) => ({
          userId: friend.id,
          firstName: friend.first_name,
          lastName: friend.last_name ?? null,
          email: friend.email
        })) || [];

      return {
        output: {
          success: result.success !== false,
          addedUsers
        },
        message: `Added friend **${f.email}**`
      };
    } else {
      let result = await client.addFriends(ctx.input.friends);

      let addedUsers =
        result.friends?.map((friend: any) => ({
          userId: friend.id,
          firstName: friend.first_name,
          lastName: friend.last_name ?? null,
          email: friend.email
        })) || [];

      return {
        output: {
          success: result.success !== false,
          addedUsers
        },
        message: `Added **${ctx.input.friends.length}** friend(s)`
      };
    }
  })
  .build();
