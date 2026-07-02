import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelegramClient } from '../lib/client';
import { spec } from '../spec';

export let sendPollTool = SlateTool.create(spec, {
  name: 'Send Poll',
  key: 'send_poll',
  description: `Create and send a poll or quiz to a chat. Supports regular polls with optional multiple-answer mode, and quiz-mode polls with a single correct answer and explanation.`,
  instructions: [
    'For a quiz, set pollType to "quiz" and provide correctOptionIndex (0-based index of the correct answer).',
    'Use openPeriod (seconds) or closeDate (unix timestamp) to auto-close the poll.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      chatId: z.string().describe('Chat ID or @username'),
      question: z.string().describe('Poll question (1-300 characters)'),
      options: z.array(z.string()).min(2).max(10).describe('Answer options (2-10 choices)'),
      pollType: z.enum(['regular', 'quiz']).optional().describe('Poll type: regular or quiz'),
      isAnonymous: z
        .boolean()
        .optional()
        .describe('Whether the poll is anonymous (default true)'),
      allowsMultipleAnswers: z
        .boolean()
        .optional()
        .describe('Allow multiple answers (regular polls only)'),
      correctOptionIndex: z
        .number()
        .optional()
        .describe('0-based index of the correct answer (quiz only)'),
      explanation: z
        .string()
        .optional()
        .describe('Explanation shown after answering (quiz only, 0-200 chars)'),
      openPeriod: z.number().optional().describe('Auto-close after this many seconds (5-600)'),
      closeDate: z
        .number()
        .optional()
        .describe('Unix timestamp when the poll will auto-close'),
      disableNotification: z.boolean().optional().describe('Send silently'),
      messageThreadId: z.number().optional().describe('Forum topic thread ID')
    })
  )
  .output(
    z.object({
      messageId: z.number().describe('ID of the message containing the poll'),
      chatId: z.string().describe('Chat ID where the poll was sent'),
      pollId: z.string().describe('Unique poll identifier'),
      question: z.string().describe('Poll question'),
      totalVoterCount: z.number().describe('Total number of voters')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelegramClient(ctx.auth.token);

    let result = await client.sendPoll({
      chatId: ctx.input.chatId,
      question: ctx.input.question,
      options: ctx.input.options.map(text => ({ text })),
      type: ctx.input.pollType,
      isAnonymous: ctx.input.isAnonymous,
      allowsMultipleAnswers: ctx.input.allowsMultipleAnswers,
      correctOptionId: ctx.input.correctOptionIndex,
      explanation: ctx.input.explanation,
      openPeriod: ctx.input.openPeriod,
      closeDate: ctx.input.closeDate,
      disableNotification: ctx.input.disableNotification,
      messageThreadId: ctx.input.messageThreadId
    });

    return {
      output: {
        messageId: result.message_id,
        chatId: String(result.chat.id),
        pollId: result.poll.id,
        question: result.poll.question,
        totalVoterCount: result.poll.total_voter_count
      },
      message: `Poll "${ctx.input.question}" sent to chat **${ctx.input.chatId}** with ${ctx.input.options.length} options.`
    };
  })
  .build();
