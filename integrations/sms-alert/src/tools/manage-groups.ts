import { SlateTool } from 'slates';
import { z } from 'zod';
import { SmsAlertClient } from '../lib/client';
import { spec } from '../spec';

export let manageGroups = SlateTool.create(spec, {
  name: 'Manage Groups',
  key: 'manage_groups',
  description: `List, create, rename, or delete contact groups. Groups are reusable recipient lists for sending bulk SMS campaigns.`,
  instructions: ['Group names must not contain spaces.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'rename', 'delete'])
        .describe(
          'Action to perform: list all groups, create a new group, rename an existing group, or delete a group.'
        ),
      groupName: z
        .string()
        .optional()
        .describe(
          'Name of the group (required for create, rename, delete). For rename, this is the new name.'
        ),
      oldGroupName: z
        .string()
        .optional()
        .describe('Current group name to rename (required for rename action).')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the API response.'),
      description: z.any().describe('Response details including group list or confirmation.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmsAlertClient({ token: ctx.auth.token });

    let result: any;

    if (ctx.input.action === 'list') {
      ctx.info('Listing groups');
      result = await client.listGroups();
      return {
        output: {
          status: result.status || 'unknown',
          description: result.description || result
        },
        message: `Retrieved contact groups`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.groupName) throw new Error('Group name is required to create a group.');

      ctx.info(`Creating group: ${ctx.input.groupName}`);
      result = await client.createGroup({ groupName: ctx.input.groupName });
      return {
        output: {
          status: result.status || 'unknown',
          description: result.description || result
        },
        message: `Group **${ctx.input.groupName}** created`
      };
    }

    if (ctx.input.action === 'rename') {
      if (!ctx.input.oldGroupName) throw new Error('Old group name is required to rename.');
      if (!ctx.input.groupName) throw new Error('New group name is required to rename.');

      ctx.info(`Renaming group ${ctx.input.oldGroupName} to ${ctx.input.groupName}`);
      result = await client.editGroup({
        oldGroupName: ctx.input.oldGroupName,
        newGroupName: ctx.input.groupName
      });
      return {
        output: {
          status: result.status || 'unknown',
          description: result.description || result
        },
        message: `Group **${ctx.input.oldGroupName}** renamed to **${ctx.input.groupName}**`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.groupName) throw new Error('Group name is required to delete a group.');

      ctx.info(`Deleting group: ${ctx.input.groupName}`);
      result = await client.deleteGroup({ groupName: ctx.input.groupName });
      return {
        output: {
          status: result.status || 'unknown',
          description: result.description || result
        },
        message: `Group **${ctx.input.groupName}** deleted`
      };
    }

    throw new Error(`Invalid action: ${ctx.input.action}`);
  })
  .build();
