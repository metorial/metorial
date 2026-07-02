import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZoomClient } from '../lib/client';
import { zoomServiceError } from '../lib/errors';
import { spec } from '../spec';

let pollQuestionSchema = z.object({
  name: z.string().describe('Poll question text'),
  type: z
    .enum([
      'single',
      'multiple',
      'matching',
      'rank_order',
      'short_answer',
      'long_answer',
      'fill_in_the_blank',
      'rating_scale'
    ])
    .default('single')
    .describe('Poll question type'),
  answers: z.array(z.string()).optional().describe('Answer choices for choice questions'),
  rightAnswers: z.array(z.string()).optional().describe('Correct answer values for quizzes'),
  answerMinCharacter: z
    .number()
    .optional()
    .describe('Minimum character count for short or long answer questions'),
  answerMaxCharacter: z
    .number()
    .optional()
    .describe('Maximum character count for short or long answer questions'),
  answerRequired: z.boolean().optional().describe('Whether participants must answer'),
  caseSensitive: z
    .boolean()
    .optional()
    .describe('Whether fill-in-the-blank answers are case sensitive'),
  showAsDropdown: z.boolean().optional().describe('Show single-choice answers as a dropdown'),
  prompts: z.any().optional().describe('Prompt definitions for matching or rank-order polls'),
  ratingMinValue: z.number().optional().describe('Minimum rating scale value'),
  ratingMaxValue: z.number().optional().describe('Maximum rating scale value'),
  ratingMinLabel: z.string().optional().describe('Minimum rating scale label'),
  ratingMaxLabel: z.string().optional().describe('Maximum rating scale label')
});

let pollInputSchema = z.object({
  title: z.string().max(64).optional().describe('Poll title'),
  anonymous: z.boolean().optional().describe('Whether answers are anonymous'),
  pollType: z
    .union([z.literal(1), z.literal(2), z.literal(3)])
    .optional()
    .describe('1=poll, 2=advanced poll, 3=quiz'),
  questions: z.array(pollQuestionSchema).optional().describe('Poll questions')
});

let mapQuestion = (question: z.infer<typeof pollQuestionSchema>) => ({
  name: question.name,
  type: question.type,
  answers: question.answers,
  right_answers: question.rightAnswers,
  answer_min_character: question.answerMinCharacter,
  answer_max_character: question.answerMaxCharacter,
  answer_required: question.answerRequired,
  case_sensitive: question.caseSensitive,
  show_as_dropdown: question.showAsDropdown,
  prompts: question.prompts,
  rating_min_value: question.ratingMinValue,
  rating_max_value: question.ratingMaxValue,
  rating_min_label: question.ratingMinLabel,
  rating_max_label: question.ratingMaxLabel
});

let buildPollPayload = (input: z.infer<typeof pollInputSchema>) => ({
  title: input.title,
  anonymous: input.anonymous,
  poll_type: input.pollType,
  questions: input.questions?.map(mapQuestion)
});

let mapPoll = (poll: any) => ({
  pollId: poll.id,
  title: poll.title,
  status: poll.status,
  anonymous: poll.anonymous,
  pollType: poll.poll_type,
  questions: poll.questions
});

export let manageMeetingPolls = SlateTool.create(spec, {
  name: 'Manage Meeting Polls',
  key: 'manage_meeting_polls',
  description: 'List, create, retrieve, update, or delete polls for a Zoom meeting.',
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z
      .object({
        meetingId: z.union([z.string(), z.number()]).describe('The meeting ID'),
        action: z
          .enum(['list', 'create', 'get', 'update', 'delete'])
          .describe('Poll action to perform'),
        pollId: z.string().optional().describe('Poll ID for get, update, or delete'),
        anonymous: z
          .boolean()
          .optional()
          .describe('Filter anonymous polls when listing, or set anonymity when writing'),
        title: pollInputSchema.shape.title,
        pollType: pollInputSchema.shape.pollType,
        questions: pollInputSchema.shape.questions
      })
      .describe('Meeting poll action input')
  )
  .output(
    z.object({
      success: z.boolean().optional().describe('Whether the mutation succeeded'),
      polls: z
        .array(
          z.object({
            pollId: z.string().describe('Poll ID'),
            title: z.string().optional().describe('Poll title'),
            status: z.string().optional().describe('Poll status'),
            anonymous: z.boolean().optional().describe('Whether responses are anonymous'),
            pollType: z.number().optional().describe('1=poll, 2=advanced poll, 3=quiz'),
            questions: z.any().optional().describe('Poll questions')
          })
        )
        .optional()
        .describe('Polls returned by list'),
      poll: z
        .object({
          pollId: z.string().describe('Poll ID'),
          title: z.string().optional().describe('Poll title'),
          status: z.string().optional().describe('Poll status'),
          anonymous: z.boolean().optional().describe('Whether responses are anonymous'),
          pollType: z.number().optional().describe('1=poll, 2=advanced poll, 3=quiz'),
          questions: z.any().optional().describe('Poll questions')
        })
        .optional()
        .describe('Poll returned by create, get, or update')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZoomClient(ctx.auth.token);

    if (ctx.input.action === 'list') {
      let result = await client.listMeetingPolls(ctx.input.meetingId, {
        anonymous: ctx.input.anonymous
      });
      let polls = (result.polls || []).map(mapPoll);

      return {
        output: { polls },
        message: `Found **${polls.length}** poll(s) for meeting **${ctx.input.meetingId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.pollId) {
        throw zoomServiceError('pollId is required to delete a meeting poll.');
      }

      await client.deleteMeetingPoll(ctx.input.meetingId, ctx.input.pollId);
      return {
        output: { success: true },
        message: `Deleted poll **${ctx.input.pollId}** from meeting **${ctx.input.meetingId}**.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.pollId) {
        throw zoomServiceError('pollId is required to get a meeting poll.');
      }

      let poll = await client.getMeetingPoll(ctx.input.meetingId, ctx.input.pollId);
      return {
        output: { poll: mapPoll(poll) },
        message: `Retrieved poll **${ctx.input.pollId}** from meeting **${ctx.input.meetingId}**.`
      };
    }

    if (!ctx.input.title || !ctx.input.questions?.length) {
      throw zoomServiceError(
        'title and at least one question are required to create or update a meeting poll.'
      );
    }

    let pollData = buildPollPayload({
      title: ctx.input.title,
      anonymous: ctx.input.anonymous,
      pollType: ctx.input.pollType,
      questions: ctx.input.questions
    });

    if (ctx.input.action === 'create') {
      let poll = await client.createMeetingPoll(ctx.input.meetingId, pollData);
      return {
        output: { poll: mapPoll(poll) },
        message: `Created poll **${ctx.input.title}** for meeting **${ctx.input.meetingId}**.`
      };
    }

    if (!ctx.input.pollId) {
      throw zoomServiceError('pollId is required to update a meeting poll.');
    }

    await client.updateMeetingPoll(ctx.input.meetingId, ctx.input.pollId, pollData);
    let poll = await client.getMeetingPoll(ctx.input.meetingId, ctx.input.pollId);

    return {
      output: { success: true, poll: mapPoll(poll) },
      message: `Updated poll **${ctx.input.pollId}** for meeting **${ctx.input.meetingId}**.`
    };
  })
  .build();
