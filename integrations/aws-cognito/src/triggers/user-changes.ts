import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createCognitoClient, formatAttributes } from '../lib/helpers';
import { spec } from '../spec';

export let userChanges = SlateTrigger.create(spec, {
  name: 'User Changes',
  key: 'user_changes',
  description:
    'Detects new and modified users in a Cognito user pool by polling the ListUsers API. Triggers on user creation and attribute/status changes.'
})
  .input(
    z.object({
      username: z.string(),
      eventType: z.enum(['created', 'updated']),
      userPoolId: z.string(),
      attributes: z.record(z.string(), z.string()),
      enabled: z.boolean(),
      userStatus: z.string(),
      creationDate: z.number().optional(),
      lastModifiedDate: z.number().optional()
    })
  )
  .output(
    z.object({
      username: z.string(),
      userPoolId: z.string(),
      email: z.string().optional(),
      phoneNumber: z.string().optional(),
      enabled: z.boolean(),
      userStatus: z.string(),
      attributes: z.record(z.string(), z.string()),
      creationDate: z.number().optional(),
      lastModifiedDate: z.number().optional()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createCognitoClient(ctx);
      let lastPollTime = (ctx.state?.lastPollTime as number) || 0;
      let knownUsers = (ctx.state?.knownUsers as Record<string, number>) || {};
      let userPoolId = (ctx.state?.userPoolId as string) || '';

      if (!userPoolId) {
        let pools = await client.listUserPools(1);
        if (!pools.UserPools || pools.UserPools.length === 0) {
          return {
            inputs: [],
            updatedState: { lastPollTime: Date.now() / 1000, knownUsers: {}, userPoolId: '' }
          };
        }
        userPoolId = pools.UserPools[0].Id;
      }

      let allUsers: any[] = [];
      let paginationToken: string | undefined;

      do {
        let result = await client.listUsers(userPoolId, {
          limit: 60,
          paginationToken
        });
        allUsers.push(...(result.Users || []));
        paginationToken = result.PaginationToken;
      } while (paginationToken);

      let inputs: Array<{
        username: string;
        eventType: 'created' | 'updated';
        userPoolId: string;
        attributes: Record<string, string>;
        enabled: boolean;
        userStatus: string;
        creationDate?: number;
        lastModifiedDate?: number;
      }> = [];

      let updatedKnownUsers: Record<string, number> = {};

      for (let user of allUsers) {
        let modifiedTime = user.UserLastModifiedDate || 0;
        let createdTime = user.UserCreateDate || 0;
        let prevModifiedTime = knownUsers[user.Username];
        updatedKnownUsers[user.Username] = modifiedTime;

        if (prevModifiedTime === undefined && lastPollTime > 0) {
          inputs.push({
            username: user.Username,
            eventType: 'created',
            userPoolId,
            attributes: formatAttributes(user.Attributes || []),
            enabled: user.Enabled,
            userStatus: user.UserStatus,
            creationDate: createdTime,
            lastModifiedDate: modifiedTime
          });
        } else if (prevModifiedTime !== undefined && modifiedTime > prevModifiedTime) {
          inputs.push({
            username: user.Username,
            eventType: 'updated',
            userPoolId,
            attributes: formatAttributes(user.Attributes || []),
            enabled: user.Enabled,
            userStatus: user.UserStatus,
            creationDate: createdTime,
            lastModifiedDate: modifiedTime
          });
        }
      }

      return {
        inputs,
        updatedState: {
          lastPollTime: Date.now() / 1000,
          knownUsers: updatedKnownUsers,
          userPoolId
        }
      };
    },

    handleEvent: async ctx => {
      let attrs = ctx.input.attributes as Record<string, string>;

      return {
        type: `user.${ctx.input.eventType}`,
        id: `${ctx.input.username}-${ctx.input.lastModifiedDate || Date.now()}`,
        output: {
          username: ctx.input.username,
          userPoolId: ctx.input.userPoolId,
          email: attrs.email || undefined,
          phoneNumber: attrs.phone_number || undefined,
          enabled: ctx.input.enabled,
          userStatus: ctx.input.userStatus,
          attributes: ctx.input.attributes as Record<string, string>,
          creationDate: ctx.input.creationDate,
          lastModifiedDate: ctx.input.lastModifiedDate
        }
      };
    }
  })
  .build();
