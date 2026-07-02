import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { AuthClient } from '../lib/client';
import { firebaseActionScopes } from '../scopes';
import { spec } from '../spec';

export let userChanges = SlateTrigger.create(spec, {
  name: 'User Account Changes',
  key: 'user_changes',
  description:
    'Monitors Firebase Authentication for new user accounts and detects when users are created or removed by comparing user lists between polls.'
})
  .scopes(firebaseActionScopes.userChanges)
  .input(
    z.object({
      changeType: z.enum(['created', 'deleted']).describe('Type of user change detected'),
      userId: z.string().describe('Firebase user ID'),
      email: z.string().optional().describe('User email address'),
      displayName: z.string().optional().describe('User display name'),
      phoneNumber: z.string().optional().describe('User phone number'),
      createdAt: z.string().optional().describe('Account creation timestamp')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('Firebase user ID'),
      email: z.string().optional().describe('User email address'),
      displayName: z.string().optional().describe('User display name'),
      phoneNumber: z.string().optional().describe('User phone number'),
      createdAt: z.string().optional().describe('Account creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let state = ctx.state || {};
      let knownUserIds: string[] = state.knownUserIds || [];
      let isFirstPoll = state.isFirstPoll !== false;

      let client = new AuthClient({
        token: ctx.auth.token,
        projectId: ctx.config.projectId
      });

      let allUserIds: string[] = [];
      let userMap: Record<string, any> = {};
      let pageToken: string | undefined;

      do {
        let result = await client.listUsers({
          maxResults: 1000,
          nextPageToken: pageToken
        });

        for (let user of result.users) {
          allUserIds.push(user.userId);
          userMap[user.userId] = user;
        }

        pageToken = result.nextPageToken;
      } while (pageToken);

      let inputs: Array<{
        changeType: 'created' | 'deleted';
        userId: string;
        email?: string;
        displayName?: string;
        phoneNumber?: string;
        createdAt?: string;
      }> = [];

      if (!isFirstPoll) {
        let knownSet = new Set(knownUserIds);
        let currentSet = new Set(allUserIds);

        for (let userId of allUserIds) {
          if (!knownSet.has(userId)) {
            let user = userMap[userId];
            inputs.push({
              changeType: 'created',
              userId,
              email: user?.email,
              displayName: user?.displayName,
              phoneNumber: user?.phoneNumber,
              createdAt: user?.createdAt
            });
          }
        }

        for (let userId of knownUserIds) {
          if (!currentSet.has(userId)) {
            inputs.push({
              changeType: 'deleted',
              userId
            });
          }
        }
      }

      return {
        inputs,
        updatedState: {
          knownUserIds: allUserIds,
          isFirstPoll: false
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
          displayName: ctx.input.displayName,
          phoneNumber: ctx.input.phoneNumber,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
