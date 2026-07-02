import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createCognitoClient } from '../lib/helpers';
import { spec } from '../spec';

export let groupChanges = SlateTrigger.create(spec, {
  name: 'Group Changes',
  key: 'group_changes',
  description:
    'Detects new, modified, and deleted groups in a Cognito user pool by polling the ListGroups API. Triggers on group creation, updates, and deletion.'
})
  .input(
    z.object({
      groupName: z.string(),
      userPoolId: z.string(),
      eventType: z.enum(['created', 'updated', 'deleted']),
      description: z.string().optional(),
      precedence: z.number().optional(),
      roleArn: z.string().optional(),
      creationDate: z.number().optional(),
      lastModifiedDate: z.number().optional()
    })
  )
  .output(
    z.object({
      groupName: z.string(),
      userPoolId: z.string(),
      description: z.string().optional(),
      precedence: z.number().optional(),
      roleArn: z.string().optional(),
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
      let knownGroups = (ctx.state?.knownGroups as Record<string, number>) || {};
      let userPoolId = (ctx.state?.userPoolId as string) || '';

      if (!userPoolId) {
        let pools = await client.listUserPools(1);
        if (!pools.UserPools || pools.UserPools.length === 0) {
          return {
            inputs: [],
            updatedState: { lastPollTime: Date.now() / 1000, knownGroups: {}, userPoolId: '' }
          };
        }
        userPoolId = pools.UserPools[0].Id;
      }

      let allGroups: any[] = [];
      let nextToken: string | undefined;

      do {
        let result = await client.listGroups(userPoolId, 60, nextToken);
        allGroups.push(...(result.Groups || []));
        nextToken = result.NextToken;
      } while (nextToken);

      let inputs: Array<{
        groupName: string;
        userPoolId: string;
        eventType: 'created' | 'updated' | 'deleted';
        description?: string;
        precedence?: number;
        roleArn?: string;
        creationDate?: number;
        lastModifiedDate?: number;
      }> = [];

      let updatedKnownGroups: Record<string, number> = {};
      let currentGroupNames = new Set<string>();

      for (let group of allGroups) {
        let modifiedTime = group.LastModifiedDate || 0;
        let prevModifiedTime = knownGroups[group.GroupName];
        updatedKnownGroups[group.GroupName] = modifiedTime;
        currentGroupNames.add(group.GroupName);

        if (prevModifiedTime === undefined && lastPollTime > 0) {
          inputs.push({
            groupName: group.GroupName,
            userPoolId,
            eventType: 'created',
            description: group.Description,
            precedence: group.Precedence,
            roleArn: group.RoleArn,
            creationDate: group.CreationDate,
            lastModifiedDate: modifiedTime
          });
        } else if (prevModifiedTime !== undefined && modifiedTime > prevModifiedTime) {
          inputs.push({
            groupName: group.GroupName,
            userPoolId,
            eventType: 'updated',
            description: group.Description,
            precedence: group.Precedence,
            roleArn: group.RoleArn,
            creationDate: group.CreationDate,
            lastModifiedDate: modifiedTime
          });
        }
      }

      if (lastPollTime > 0) {
        for (let groupName of Object.keys(knownGroups)) {
          if (!currentGroupNames.has(groupName)) {
            inputs.push({
              groupName,
              userPoolId,
              eventType: 'deleted'
            });
          }
        }
      }

      return {
        inputs,
        updatedState: {
          lastPollTime: Date.now() / 1000,
          knownGroups: updatedKnownGroups,
          userPoolId
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `group.${ctx.input.eventType}`,
        id: `${ctx.input.groupName}-${ctx.input.lastModifiedDate || Date.now()}`,
        output: {
          groupName: ctx.input.groupName,
          userPoolId: ctx.input.userPoolId,
          description: ctx.input.description,
          precedence: ctx.input.precedence,
          roleArn: ctx.input.roleArn,
          creationDate: ctx.input.creationDate,
          lastModifiedDate: ctx.input.lastModifiedDate
        }
      };
    }
  })
  .build();
