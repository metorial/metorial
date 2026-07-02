import { SlateTool } from 'slates';
import { z } from 'zod';
import { PushoverClient } from '../lib/client';
import { spec } from '../spec';

export let manageGroupMembers = SlateTool.create(spec, {
  name: 'Manage Group Members',
  key: 'manage_group_members',
  description: `Add, remove, enable, or disable users within a delivery group. Each operation targets a specific user within a group and optionally a specific device.`,
  instructions: [
    'Use action `add` to add a user to the group. Optionally restrict to a specific **device** and add a **memo**.',
    'Use action `remove` to remove a user (optionally a specific device) from the group.',
    'Use action `disable` to temporarily disable a user in the group without removing them.',
    'Use action `enable` to re-enable a previously disabled user in the group.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['add', 'remove', 'disable', 'enable'])
        .describe('The member operation to perform'),
      groupKey: z.string().describe('Group key of the target group'),
      memberUserKey: z.string().describe('Pushover user key of the member'),
      device: z.string().optional().describe('Restrict operation to a specific device name'),
      memo: z
        .string()
        .optional()
        .describe('Free-text memo about the member (max 200 characters, only for add action)')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('Unique request identifier')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PushoverClient({
      token: ctx.auth.token,
      userKey: ctx.auth.userKey
    });

    let result: { status: number; request: string };

    switch (ctx.input.action) {
      case 'add':
        result = await client.addUserToGroup(ctx.input.groupKey, {
          userKey: ctx.input.memberUserKey,
          device: ctx.input.device,
          memo: ctx.input.memo
        });
        break;

      case 'remove':
        result = await client.removeUserFromGroup(ctx.input.groupKey, {
          userKey: ctx.input.memberUserKey,
          device: ctx.input.device
        });
        break;

      case 'disable':
        result = await client.disableUserInGroup(ctx.input.groupKey, {
          userKey: ctx.input.memberUserKey,
          device: ctx.input.device
        });
        break;

      case 'enable':
        result = await client.enableUserInGroup(ctx.input.groupKey, {
          userKey: ctx.input.memberUserKey,
          device: ctx.input.device
        });
        break;
    }

    let actionLabel = {
      add: 'Added',
      remove: 'Removed',
      disable: 'Disabled',
      enable: 'Enabled'
    }[ctx.input.action];

    return {
      output: {
        requestId: result.request
      },
      message: `${actionLabel} user \`${ctx.input.memberUserKey}\` in group \`${ctx.input.groupKey}\`.`
    };
  })
  .build();
