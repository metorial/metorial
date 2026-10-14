import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { SmsAlertClient, type SmsAlertResponse } from '../lib/client';
import { groupIdSchema, limitSchema, orderSchema, pageSchema } from '../lib/schemas';
import { spec } from '../spec';

export let manageGroups = SlateTool.create(spec, {
  name: 'Manage Groups',
  key: 'manage_groups',
  description: `List, create, rename, or delete contact groups. Groups are reusable recipient lists for sending bulk SMS campaigns.`,
  instructions: ['Group names must not contain spaces.'],
  tags: {
    destructive: true,
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
      groupId: groupIdSchema,
      page: pageSchema,
      limit: limitSchema,
      order: orderSchema,
      query: z.string().optional().describe('Search query for action list.'),
      groupName: z
        .string()
        .optional()
        .describe(
          'Group name: required for create and the new name for rename. For delete, use this or groupId.'
        ),
      oldGroupName: z
        .string()
        .optional()
        .describe(
          'Current group name to rename. Required for rename when groupId is not supplied.'
        )
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the API response.'),
      description: z.any().describe('Response details including group list or confirmation.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmsAlertClient(ctx.auth);

    let result: SmsAlertResponse;
    if (
      ['create', 'rename'].includes(ctx.input.action) &&
      ctx.input.groupName &&
      /\s/.test(ctx.input.groupName)
    ) {
      throw createApiServiceError('Group names must not contain spaces.');
    }

    if (ctx.input.action === 'list') {
      ctx.info('Listing groups');
      result = await client.listGroups(ctx.input);
      return {
        output: {
          status: result.status || 'unknown',
          description: result.description ?? result
        },
        message: `Retrieved contact groups`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.groupName)
        throw createApiServiceError('Group name is required to create a group.');

      ctx.info(`Creating group: ${ctx.input.groupName}`);
      result = await client.createGroup({ groupName: ctx.input.groupName });
      return {
        output: {
          status: result.status || 'unknown',
          description: result.description ?? result
        },
        message: `Group **${ctx.input.groupName}** created`
      };
    }

    if (ctx.input.action === 'rename') {
      if (!ctx.input.oldGroupName && !ctx.input.groupId)
        throw createApiServiceError('Provide groupId or oldGroupName to rename.');
      if (!ctx.input.groupName)
        throw createApiServiceError('New group name is required to rename.');

      ctx.info(`Renaming group ${ctx.input.oldGroupName} to ${ctx.input.groupName}`);
      result = await client.editGroup({
        oldGroupName: ctx.input.oldGroupName,
        groupId: ctx.input.groupId,
        newGroupName: ctx.input.groupName
      });
      return {
        output: {
          status: result.status || 'unknown',
          description: result.description ?? result
        },
        message: `Group **${ctx.input.oldGroupName || ctx.input.groupId}** renamed to **${ctx.input.groupName}**`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.groupName && !ctx.input.groupId)
        throw createApiServiceError('Provide groupId or groupName to delete a group.');

      ctx.info(`Deleting group: ${ctx.input.groupName}`);
      result = await client.deleteGroup({
        groupName: ctx.input.groupName,
        groupId: ctx.input.groupId
      });
      return {
        output: {
          status: result.status || 'unknown',
          description: result.description ?? result
        },
        message: `Group **${ctx.input.groupName || ctx.input.groupId}** deleted`
      };
    }

    throw createApiServiceError(`Invalid action: ${ctx.input.action}`);
  })
  .build();
