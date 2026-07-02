import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let answerSchema = z.object({
  answerId: z.number().describe('Unique identifier of the answer'),
  questionId: z.number().describe('ID of the parent question'),
  score: z.number().describe('Net vote score'),
  isAccepted: z.boolean().describe('Whether this is the accepted answer'),
  body: z.string().optional().describe('HTML body of the answer'),
  creationDate: z.string().describe('When the answer was posted (ISO 8601)'),
  lastActivityDate: z
    .string()
    .optional()
    .describe('When the answer was last edited (ISO 8601)'),
  ownerDisplayName: z.string().optional().describe('Display name of the author'),
  ownerUserId: z.number().optional().describe('User ID of the author'),
  link: z.string().optional().describe('URL to the answer')
});

export let getAnswers = SlateTool.create(spec, {
  name: 'Get Answers',
  key: 'get_answers',
  description: `Retrieve answers for a specific question or by answer IDs. Returns answer body, score, acceptance status, and author details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      questionId: z.string().optional().describe('Get all answers for this question ID'),
      answerIds: z
        .array(z.string())
        .optional()
        .describe('Retrieve specific answers by their IDs'),
      sort: z
        .enum(['activity', 'creation', 'votes'])
        .optional()
        .describe('How to sort answers'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      page: z.number().optional().describe('Page number (1-indexed)'),
      pageSize: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      answers: z.array(answerSchema).describe('List of answers'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      key: ctx.auth.key,
      site: ctx.config.site
    });

    let result: any;
    if (ctx.input.answerIds && ctx.input.answerIds.length > 0) {
      result = await client.getAnswersByIds(ctx.input.answerIds);
    } else if (ctx.input.questionId) {
      result = await client.getQuestionAnswers(ctx.input.questionId, {
        sort: ctx.input.sort,
        order: ctx.input.order,
        page: ctx.input.page,
        pageSize: ctx.input.pageSize
      });
    } else {
      throw new Error('Either questionId or answerIds must be provided.');
    }

    let answers = result.items.map((a: any) => ({
      answerId: a.answer_id,
      questionId: a.question_id,
      score: a.score,
      isAccepted: a.is_accepted ?? false,
      body: a.body,
      creationDate: new Date(a.creation_date * 1000).toISOString(),
      lastActivityDate: a.last_activity_date
        ? new Date(a.last_activity_date * 1000).toISOString()
        : undefined,
      ownerDisplayName: a.owner?.display_name,
      ownerUserId: a.owner?.user_id,
      link: a.link
    }));

    return {
      output: { answers, hasMore: result.hasMore },
      message: `Retrieved **${answers.length}** answer(s)${result.hasMore ? ' (more available)' : ''}.`
    };
  })
  .build();
