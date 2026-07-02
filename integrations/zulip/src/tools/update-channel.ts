import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateChannel = SlateTool.create(spec, {
  name: 'Update Channel',
  key: 'update_channel',
  description: `Update a Zulip channel's properties such as name, description, or privacy settings. Requires administrator permissions.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      channelId: z.number().describe('ID of the channel to update'),
      name: z.string().optional().describe('New name for the channel'),
      description: z.string().optional().describe('New description for the channel'),
      isPrivate: z
        .boolean()
        .optional()
        .describe('Change whether the channel is private (invite-only)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      serverUrl: ctx.auth.serverUrl,
      email: ctx.auth.email,
      token: ctx.auth.token
    });

    await client.updateChannel(ctx.input.channelId, {
      name: ctx.input.name,
      description: ctx.input.description,
      isPrivate: ctx.input.isPrivate
    });

    return {
      output: { success: true },
      message: `Channel ${ctx.input.channelId} updated successfully`
    };
  })
  .build();
