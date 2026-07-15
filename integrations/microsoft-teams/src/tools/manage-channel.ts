import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphClient } from '../lib/client';
import { microsoftTeamsActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageChannel = SlateTool.create(spec, {
  name: 'Manage Channel',
  key: 'manage_channel',
  description: `Create, update, or delete a channel in a Microsoft Team. Supports standard, private, and shared channel types. Use this tool to manage the lifecycle of team channels.`,
  instructions: [
    'For creating a channel, provide teamId, action="create", displayName, and optionally description and membershipType.',
    'For updating, provide teamId, channelId, action="update", and the fields to change.',
    'For deleting, provide teamId, channelId, and action="delete".'
  ]
})
  .scopes(microsoftTeamsActionScopes.manageChannel)
  .input(
    z.object({
      teamId: z.string().describe('ID of the team'),
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      channelId: z
        .string()
        .optional()
        .describe('ID of the channel (required for update/delete)'),
      displayName: z
        .string()
        .optional()
        .describe('Channel display name (required for create)'),
      description: z.string().optional().describe('Channel description'),
      membershipType: z
        .enum(['standard', 'private', 'shared'])
        .optional()
        .describe('Channel type (for create only)')
    })
  )
  .output(
    z.object({
      channelId: z.string().optional().describe('ID of the created/updated channel'),
      displayName: z.string().optional().describe('Display name of the channel'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphClient({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      let body: any = {
        displayName: ctx.input.displayName,
        description: ctx.input.description || ''
      };
      if (ctx.input.membershipType) {
        body.membershipType = ctx.input.membershipType;
      }

      let channel = await client.createChannel(ctx.input.teamId, body);
      return {
        output: {
          channelId: channel.id,
          displayName: channel.displayName,
          success: true
        },
        message: `Channel **${channel.displayName}** created successfully.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.channelId) throw new Error('channelId is required for update');
      let body: any = {};
      if (ctx.input.displayName) body.displayName = ctx.input.displayName;
      if (ctx.input.description !== undefined) body.description = ctx.input.description;

      await client.updateChannel(ctx.input.teamId, ctx.input.channelId, body);
      return {
        output: {
          channelId: ctx.input.channelId,
          displayName: ctx.input.displayName,
          success: true
        },
        message: `Channel updated successfully.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.channelId) throw new Error('channelId is required for delete');
      await client.deleteChannel(ctx.input.teamId, ctx.input.channelId);
      return {
        output: {
          channelId: ctx.input.channelId,
          success: true
        },
        message: `Channel deleted successfully.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
