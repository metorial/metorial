import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';
import { slackEventsTriggerGroup } from './eventsTriggerGroup';

let slackReactionEvent = z
  .object({
    type: z.union([z.literal('reaction_added'), z.literal('reaction_removed')]),
    user: z.string().optional(),
    reaction: z.string(),
    item_user: z.string().optional(),
    event_ts: z.string().optional(),
    item: z
      .object({
        type: z.string(),
        channel: z.string().optional(),
        ts: z.string().optional()
      })
      .loose()
  })
  .loose();

let outputSchema = z.object({
  channelId: z.string().optional().describe('Channel ID the reacted-to item lives in'),
  messageTs: z.string().optional().describe('Timestamp of the reacted-to message'),
  messageText: z.string().optional().describe('Text of the message that was reacted to'),
  emoji: z.string().describe('Emoji name'),
  userId: z.string().optional().describe('User ID who added/removed the reaction'),
  itemUserId: z.string().optional().describe('User ID who owns the reacted-to item')
});

let mapReaction = async (ctx: {
  auth: { token: string };
  input: z.infer<typeof slackReactionEvent>;
}) => {
  let event = ctx.input;
  let channelId = event.item.channel;
  let messageTs = event.item.ts;

  let messageText: string | undefined;
  if (channelId && messageTs) {
    try {
      let client = new SlackClient(ctx.auth.token);
      let message = await client.getReactions({ channel: channelId, timestamp: messageTs });
      messageText = message.text;
    } catch {
      // Best-effort enrichment; the reaction itself is still worth delivering without it.
    }
  }

  return {
    channelId,
    messageTs,
    messageText,
    emoji: event.reaction,
    userId: event.user,
    itemUserId: event.item_user
  };
};

export let newReaction = SlateTrigger.create(spec, {
  name: 'New Reaction',
  key: 'new_reaction',
  description: 'Triggers when someone adds an emoji reaction to a message.'
})
  .scopes(slackActionScopes.reactionEvents)
  .triggerGroup(slackEventsTriggerGroup)
  .input(slackReactionEvent)
  .output(outputSchema)
  .matches(payload => (payload as { type?: unknown }).type === 'reaction_added')
  .map(async ctx => {
    let event = ctx.input;
    return {
      type: 'reaction.added',
      id: `reaction-added-${event.item.channel}-${event.item.ts}-${event.reaction}-${event.event_ts ?? event.user}`,
      output: await mapReaction(ctx)
    };
  })
  .build();

export let reactionRemoved = SlateTrigger.create(spec, {
  name: 'Reaction Removed',
  key: 'reaction_removed',
  description: 'Triggers when someone removes an emoji reaction from a message.'
})
  .scopes(slackActionScopes.reactionEvents)
  .triggerGroup(slackEventsTriggerGroup)
  .input(slackReactionEvent)
  .output(outputSchema)
  .matches(payload => (payload as { type?: unknown }).type === 'reaction_removed')
  .map(async ctx => {
    let event = ctx.input;
    return {
      type: 'reaction.removed',
      id: `reaction-removed-${event.item.channel}-${event.item.ts}-${event.reaction}-${event.event_ts ?? event.user}`,
      output: await mapReaction(ctx)
    };
  })
  .build();
