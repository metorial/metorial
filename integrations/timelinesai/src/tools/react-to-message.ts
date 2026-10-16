import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let reactToMessage = SlateTool.create(spec, {
  name: 'React to Message',
  key: 'react_to_message',
  description: `Add or remove an emoji reaction on a WhatsApp message. Can also retrieve current reactions on a message.`,
  instructions: [
    'Set reaction to an emoji character to add a reaction.',
    'Set reaction to an empty string to clear the reaction.',
    'Set getOnly to true to just retrieve current reactions without modifying.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      messageUid: z.string().describe('UID of the message to react to'),
      reaction: z
        .string()
        .optional()
        .describe('Emoji character to react with, or empty string to clear reaction'),
      getOnly: z
        .boolean()
        .optional()
        .describe('Only retrieve current reactions without modifying')
    })
  )
  .output(
    z.object({
      messageUid: z.string().describe('Message UID'),
      reactions: z
        .record(z.string(), z.number())
        .optional()
        .describe('Map of emoji to reaction count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { messageUid, reaction, getOnly } = ctx.input;

    if (getOnly) {
      let result = await client.getMessageReactions(messageUid);
      let counts = result?.data?.reactions ?? result?.data;
      let parsedCounts = z
        .record(z.string(), z.union([z.string(), z.number()]))
        .safeParse(counts);
      if (!parsedCounts.success) {
        throw createApiServiceError('TimelinesAI returned an invalid reaction count map.');
      }
      let reactions: Record<string, number> = {};
      for (let [emoji, count] of Object.entries(parsedCounts.data)) {
        let numericCount =
          typeof count === 'string' && /^\d+$/.test(count) ? Number(count) : count;
        if (
          typeof numericCount !== 'number' ||
          !Number.isSafeInteger(numericCount) ||
          numericCount < 0
        ) {
          throw createApiServiceError('TimelinesAI returned an invalid reaction count.');
        }
        reactions[emoji] = numericCount;
      }
      return {
        output: {
          messageUid,
          reactions
        },
        message: `Retrieved reactions for message **${messageUid}**.`
      };
    }

    if (reaction === undefined) {
      throw createApiServiceError('reaction is required when getOnly is not true');
    }

    let result = await client.setMessageReaction(messageUid, reaction);
    let resultUid = result?.data?.message_uid || messageUid;

    return {
      output: {
        messageUid: resultUid,
        reactions: undefined
      },
      message: reaction
        ? `Reacted with ${reaction} on message **${resultUid}**.`
        : `Cleared reaction on message **${resultUid}**.`
    };
  })
  .build();
