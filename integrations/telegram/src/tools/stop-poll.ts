import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelegramClient } from '../lib/client';
import { spec } from '../spec';

export let stopPollTool = SlateTool.create(spec, {
  name: 'Stop Poll',
  key: 'stop_poll',
  description: `Stop a live poll in a chat, freezing its current results. Once stopped, no more votes can be cast.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      chatId: z.string().describe('Chat ID where the poll message exists'),
      messageId: z.number().describe('Message ID of the poll to stop')
    })
  )
  .output(
    z.object({
      pollId: z.string().describe('Unique poll identifier'),
      question: z.string().describe('Poll question'),
      totalVoterCount: z.number().describe('Final number of voters'),
      isClosed: z.boolean().describe('Whether the poll is now closed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelegramClient(ctx.auth.token);

    let result = await client.stopPoll({
      chatId: ctx.input.chatId,
      messageId: ctx.input.messageId
    });

    return {
      output: {
        pollId: result.id,
        question: result.question,
        totalVoterCount: result.total_voter_count,
        isClosed: result.is_closed
      },
      message: `Poll "${result.question}" stopped with ${result.total_voter_count} total votes.`
    };
  })
  .build();
