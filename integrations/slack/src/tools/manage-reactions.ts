import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { missingRequiredFieldError } from '../lib/errors';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

export let manageReactions = SlateTool.create(spec, {
  name: 'Manage Reactions',
  key: 'manage_reactions',
  description: `Add, remove, or list emoji reactions on a Slack message. Use this to react to messages, remove existing reactions, or see all reactions on a message.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(slackActionScopes.reactions)
  .input(
    z.object({
      action: z.enum(['add', 'remove', 'list']).describe('The reaction action to perform'),
      channelId: z.string().describe('Channel ID where the message is'),
      messageTs: z.string().describe('Timestamp of the message'),
      emoji: z
        .string()
        .optional()
        .describe('Emoji name without colons (e.g. "thumbsup") — required for add/remove')
    })
  )
  .output(
    z.object({
      channelId: z.string().describe('Channel ID'),
      messageTs: z.string().describe('Message timestamp'),
      reactions: z
        .array(
          z.object({
            name: z.string().describe('Emoji name'),
            count: z.number().describe('Number of users who reacted'),
            userIds: z.array(z.string()).describe('User IDs who reacted')
          })
        )
        .optional()
        .describe('List of reactions on the message (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let { action, channelId, messageTs, emoji } = ctx.input;

    if (action === 'add') {
      if (!emoji) throw missingRequiredFieldError('emoji', 'add action');
      await client.addReaction({ channel: channelId, timestamp: messageTs, name: emoji });
      return {
        output: { channelId, messageTs },
        message: `Added :${emoji}: reaction to message \`${messageTs}\`.`
      };
    }

    if (action === 'remove') {
      if (!emoji) throw missingRequiredFieldError('emoji', 'remove action');
      await client.removeReaction({ channel: channelId, timestamp: messageTs, name: emoji });
      return {
        output: { channelId, messageTs },
        message: `Removed :${emoji}: reaction from message \`${messageTs}\`.`
      };
    }

    // list
    let message = await client.getReactions({ channel: channelId, timestamp: messageTs });
    let reactions = (message.reactions || []).map(r => ({
      name: r.name,
      count: r.count,
      userIds: r.users
    }));

    return {
      output: { channelId, messageTs, reactions },
      message: `Found ${reactions.length} reaction(s) on message \`${messageTs}\`.`
    };
  })
  .build();
