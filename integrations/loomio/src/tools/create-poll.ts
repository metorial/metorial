import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { groupIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createPoll = SlateTool.create(spec, {
  name: 'Create Poll',
  key: 'create_poll',
  description: `Create a new poll or proposal in Loomio. Supports multiple voting methods: proposals (show of thumbs), multiple choice, score voting, ranked choice, dot voting, and meeting/time polls. Configure options, closing time, anonymous voting, result visibility, and recipient notifications.`,
  instructions: [
    'For **proposal** type, options must be agree, disagree, abstain, or block.',
    'For **meeting** type, options should be ISO 8601 dates or datetime strings.',
    'For other poll types, provide arbitrary string options.',
    'Omitting closingAt creates a work-in-progress poll with voting disabled.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Title of the poll or proposal'),
      pollType: z
        .enum(['proposal', 'poll', 'count', 'score', 'ranked_choice', 'meeting', 'dot_vote'])
        .describe('Type of poll to create'),
      details: z
        .string()
        .optional()
        .describe('Description/details of the poll in Markdown or HTML'),
      detailsFormat: z
        .enum(['md', 'html'])
        .default('md')
        .describe('Format of the details content'),
      closingAt: z
        .string()
        .optional()
        .describe(
          'ISO 8601 closing time. Omit to create a work-in-progress poll with voting disabled.'
        ),
      options: z
        .array(z.string())
        .optional()
        .describe(
          'Poll option names. For proposals: agree/disagree/abstain/block. For meetings: ISO 8601 datetimes. For others: arbitrary strings.'
        ),
      groupId: groupIdSchema.optional(),
      discussionId: z
        .number()
        .optional()
        .describe('ID of an existing discussion thread to attach the poll to'),
      anonymous: z.boolean().optional().describe('Whether votes are anonymous'),
      hideResults: z
        .enum(['off', 'until_vote', 'until_closed'])
        .optional()
        .describe(
          'When to show results: off (always visible), until_vote (visible after voting), until_closed (visible after closing)'
        ),
      shuffleOptions: z
        .boolean()
        .optional()
        .describe('Whether to randomize option order for each voter'),
      specifiedVotersOnly: z
        .boolean()
        .optional()
        .describe('Restrict voting to specified recipients only'),
      recipientUserIds: z
        .array(z.number())
        .optional()
        .describe('User IDs to invite to the poll'),
      recipientEmails: z
        .array(z.string())
        .optional()
        .describe('Email addresses to invite to the poll'),
      recipientAudience: z
        .string()
        .optional()
        .describe('Set to "group" to invite the entire group'),
      notifyRecipients: z
        .boolean()
        .optional()
        .describe('Whether to send notification emails to recipients'),
      recipientMessage: z
        .string()
        .optional()
        .describe('Message to include in invitation emails'),
      notifyOnClosingSoon: z
        .enum(['nobody', 'author', 'undecided_voters', 'voters'])
        .optional()
        .describe('Who receives a reminder when the poll is closing soon')
    })
  )
  .output(
    z.object({
      pollId: z.number().describe('ID of the created poll'),
      pollKey: z.string().describe('Key of the created poll'),
      title: z.string().describe('Title of the created poll'),
      pollType: z.string().describe('Type of the created poll'),
      closingAt: z.string().optional().describe('ISO 8601 closing time')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let poll = await client.createPoll({
      title: ctx.input.title,
      pollType: ctx.input.pollType,
      details: ctx.input.details,
      detailsFormat: ctx.input.detailsFormat,
      closingAt: ctx.input.closingAt,
      options: ctx.input.options,
      groupId: ctx.input.groupId,
      discussionId: ctx.input.discussionId,
      anonymous: ctx.input.anonymous,
      hideResults: ctx.input.hideResults,
      shuffleOptions: ctx.input.shuffleOptions,
      specifiedVotersOnly: ctx.input.specifiedVotersOnly,
      recipientUserIds: ctx.input.recipientUserIds,
      recipientEmails: ctx.input.recipientEmails,
      recipientAudience: ctx.input.recipientAudience,
      recipientMessage: ctx.input.recipientMessage,
      notifyRecipients: ctx.input.notifyRecipients,
      notifyOnClosingSoon: ctx.input.notifyOnClosingSoon
    });

    return {
      output: {
        pollId: poll.id,
        pollKey: poll.key,
        title: poll.title,
        pollType: poll.poll_type,
        closingAt: poll.closing_at ?? undefined
      },
      message: `Created ${poll.poll_type} poll **"${poll.title}"** (ID: ${poll.id}).`
    };
  })
  .build();
