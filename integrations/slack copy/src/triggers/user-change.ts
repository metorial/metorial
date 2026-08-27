import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

export let userChange = SlateTrigger.create(spec, {
  name: 'User Change',
  key: 'user_change',
  description:
    '[Polling fallback] Triggers when a user joins the workspace or when user profile/status changes. Polls the user list to detect new members and profile updates.'
})
  .scopes(slackActionScopes.userChange)
  .input(
    z.object({
      eventType: z.enum(['joined', 'updated']).describe('Type of user event'),
      userId: z.string().describe('User ID'),
      name: z.string().optional().describe('Username'),
      realName: z.string().optional().describe('Real name'),
      email: z.string().optional().describe('Email address'),
      isBot: z.boolean().optional().describe('Whether this is a bot'),
      deleted: z.boolean().optional().describe('Whether the user is deactivated'),
      updatedAt: z.number().optional().describe('Last update timestamp')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('User ID'),
      name: z.string().optional().describe('Username'),
      realName: z.string().optional().describe('Full name'),
      displayName: z.string().optional().describe('Display name'),
      email: z.string().optional().describe('Email address'),
      title: z.string().optional().describe('Job title'),
      statusText: z.string().optional().describe('Custom status text'),
      statusEmoji: z.string().optional().describe('Custom status emoji'),
      isAdmin: z.boolean().optional().describe('Whether the user is an admin'),
      isBot: z.boolean().optional().describe('Whether this is a bot user'),
      deleted: z.boolean().optional().describe('Whether the user is deactivated'),
      avatarUrl: z.string().optional().describe('User avatar URL')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds * 3
    },

    pollEvents: async ctx => {
      let client = new SlackClient(ctx.auth.token);
      let state = ctx.state as { knownUsers?: Record<string, number> } | null;
      let knownUsers = state?.knownUsers || {};

      let result = await client.listUsers({ limit: 200 });
      let inputs: Array<{
        eventType: 'joined' | 'updated';
        userId: string;
        name?: string;
        realName?: string;
        email?: string;
        isBot?: boolean;
        deleted?: boolean;
        updatedAt?: number;
      }> = [];

      let updatedKnown: Record<string, number> = {};

      for (let user of result.members) {
        let updatedTs = user.updated || 0;
        updatedKnown[user.id] = updatedTs;

        let previousTs = knownUsers[user.id];

        if (previousTs === undefined) {
          if (Object.keys(knownUsers).length > 0) {
            inputs.push({
              eventType: 'joined',
              userId: user.id,
              name: user.name,
              realName: user.real_name,
              email: user.profile?.email,
              isBot: user.is_bot,
              deleted: user.deleted,
              updatedAt: updatedTs
            });
          }
        } else if (updatedTs > previousTs) {
          inputs.push({
            eventType: 'updated',
            userId: user.id,
            name: user.name,
            realName: user.real_name,
            email: user.profile?.email,
            isBot: user.is_bot,
            deleted: user.deleted,
            updatedAt: updatedTs
          });
        }
      }

      return {
        inputs,
        updatedState: {
          knownUsers: updatedKnown
        }
      };
    },

    handleEvent: async ctx => {
      let userDetails: any = {};
      try {
        let client = new SlackClient(ctx.auth.token);
        userDetails = await client.getUserInfo(ctx.input.userId);
      } catch {
        // Couldn't fetch full user details
      }

      return {
        type: `user.${ctx.input.eventType}`,
        id: `user-${ctx.input.userId}-${ctx.input.eventType}-${ctx.input.updatedAt || Date.now()}`,
        output: {
          userId: ctx.input.userId,
          name: ctx.input.name || userDetails.name,
          realName: ctx.input.realName || userDetails.real_name,
          displayName: userDetails.profile?.display_name,
          email: ctx.input.email || userDetails.profile?.email,
          title: userDetails.profile?.title,
          statusText: userDetails.profile?.status_text,
          statusEmoji: userDetails.profile?.status_emoji,
          isAdmin: userDetails.is_admin,
          isBot: ctx.input.isBot || userDetails.is_bot,
          deleted: ctx.input.deleted || userDetails.deleted,
          avatarUrl: userDetails.profile?.image_192
        }
      };
    }
  })
  .build();
