import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let userChanges = SlateTrigger.create(spec, {
  name: 'User Changes',
  key: 'user_changes',
  description:
    'Detects changes to users in the Retool organization by polling the user list and comparing with previous snapshots. Triggers on new users, deactivated users, and reactivated users.'
})
  .input(
    z.object({
      changeType: z
        .enum(['user_added', 'user_deactivated', 'user_reactivated'])
        .describe('Type of user change detected'),
      userId: z.string().describe('ID of the affected user'),
      email: z.string().describe('Email of the affected user'),
      firstName: z.string().describe('First name of the affected user'),
      lastName: z.string().describe('Last name of the affected user'),
      active: z.boolean().describe('Current active status of the user')
    })
  )
  .output(
    z.object({
      userId: z.string(),
      email: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      active: z.boolean()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

      let previousUserMap: Record<string, { active: boolean }> = ctx.state?.userMap ?? {};
      let inputs: Array<{
        changeType: 'user_added' | 'user_deactivated' | 'user_reactivated';
        userId: string;
        email: string;
        firstName: string;
        lastName: string;
        active: boolean;
      }> = [];

      let currentUserMap: Record<string, { active: boolean }> = {};
      let hasMore = true;
      let nextToken: string | undefined;

      while (hasMore) {
        let result = await client.listUsers({ limit: 100, nextToken });
        for (let user of result.data) {
          currentUserMap[user.id] = { active: user.active };

          let prev = previousUserMap[user.id];
          if (!prev) {
            // New user
            inputs.push({
              changeType: 'user_added',
              userId: user.id,
              email: user.email,
              firstName: user.first_name,
              lastName: user.last_name,
              active: user.active
            });
          } else if (prev.active && !user.active) {
            inputs.push({
              changeType: 'user_deactivated',
              userId: user.id,
              email: user.email,
              firstName: user.first_name,
              lastName: user.last_name,
              active: user.active
            });
          } else if (!prev.active && user.active) {
            inputs.push({
              changeType: 'user_reactivated',
              userId: user.id,
              email: user.email,
              firstName: user.first_name,
              lastName: user.last_name,
              active: user.active
            });
          }
        }
        hasMore = result.has_more;
        nextToken = result.next_token;
      }

      // Only emit events if we have a previous snapshot (skip initial poll)
      let isInitialPoll = Object.keys(previousUserMap).length === 0;

      return {
        inputs: isInitialPoll ? [] : inputs,
        updatedState: {
          userMap: currentUserMap
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `user.${ctx.input.changeType}`,
        id: `${ctx.input.userId}-${ctx.input.changeType}-${Date.now()}`,
        output: {
          userId: ctx.input.userId,
          email: ctx.input.email,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          active: ctx.input.active
        }
      };
    }
  })
  .build();
