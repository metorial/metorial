import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { missingRequiredFieldError } from '../lib/errors';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

export let managePins = SlateTool.create(spec, {
  name: 'Manage Pins',
  key: 'manage_pins',
  description: `Pin or unpin messages in a Slack channel, or list all pinned items. Pinned messages are highlighted and easily accessible by all channel members.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(slackActionScopes.pins)
  .input(
    z.object({
      action: z.enum(['pin', 'unpin', 'list']).describe('Pin action to perform'),
      channelId: z.string().describe('Channel ID'),
      messageTs: z
        .string()
        .optional()
        .describe('Message timestamp to pin or unpin (required for pin/unpin)')
    })
  )
  .output(
    z.object({
      channelId: z.string().describe('Channel ID'),
      pins: z
        .array(
          z.object({
            messageTs: z.string().optional().describe('Pinned message timestamp'),
            messageText: z.string().optional().describe('Pinned message text preview'),
            pinnedBy: z.string().optional().describe('User ID who pinned the item'),
            pinnedAt: z.number().optional().describe('Unix timestamp when the item was pinned')
          })
        )
        .optional()
        .describe('List of pinned items (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let { action, channelId, messageTs } = ctx.input;

    if (action === 'pin') {
      if (!messageTs) throw missingRequiredFieldError('messageTs', 'pin action');
      await client.addPin({ channel: channelId, timestamp: messageTs });
      return {
        output: { channelId },
        message: `Pinned message \`${messageTs}\` in channel \`${channelId}\`.`
      };
    }

    if (action === 'unpin') {
      if (!messageTs) throw missingRequiredFieldError('messageTs', 'unpin action');
      await client.removePin({ channel: channelId, timestamp: messageTs });
      return {
        output: { channelId },
        message: `Unpinned message \`${messageTs}\` from channel \`${channelId}\`.`
      };
    }

    // list
    let pins = await client.listPins(channelId);
    return {
      output: {
        channelId,
        pins: pins.map(p => ({
          messageTs: p.message?.ts,
          messageText: p.message?.text,
          pinnedBy: p.created_by,
          pinnedAt: p.created
        }))
      },
      message: `Found ${pins.length} pinned item(s) in channel \`${channelId}\`.`
    };
  })
  .build();
