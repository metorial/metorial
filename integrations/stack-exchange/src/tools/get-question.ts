import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { optionalProviderDate, providerDate } from '../lib/response';
import { spec } from '../spec';

let answerSchema = z.object({
  answerId: z.number().describe('Unique identifier of the answer'),
  score: z.number().describe('Net vote score'),
  isAccepted: z.boolean().describe('Whether this is the accepted answer'),
  body: z.string().optional().describe('HTML body of the answer'),
  creationDate: z.string().describe('When the answer was posted (ISO 8601)'),
  ownerDisplayName: z.string().optional().describe('Display name of the answer author'),
  ownerUserId: z.number().optional().describe('User ID of the answer author')
});

let commentSchema = z.object({
  commentId: z.number().describe('Unique identifier of the comment'),
  score: z.number().describe('Net vote score'),
  body: z.string().optional().describe('Text body of the comment'),
  creationDate: z.string().describe('When the comment was posted (ISO 8601)'),
  ownerDisplayName: z.string().optional().describe('Display name of the comment author'),
  ownerUserId: z.number().optional().describe('User ID of the comment author')
});

export let getQuestion = SlateTool.create(spec, {
  name: 'Get Question',
  key: 'get_question',
  description: `Retrieve a question by its ID along with its answers and comments. Returns the full question details including body, score, tags, with paginated answers and comments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      questionId: z.string().describe('The ID of the question to retrieve'),
      answersPage: z.number().optional().describe('Page of answers to include, starting at 1'),
      answersPageSize: z
        .number()
        .optional()
        .describe('Answers per page, from 0 to 100 (default 30)'),
      commentsPage: z
        .number()
        .optional()
        .describe('Page of comments to include, starting at 1'),
      commentsPageSize: z
        .number()
        .optional()
        .describe('Comments per page, from 0 to 100 (default 30)'),
      includeAnswers: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to include answers'),
      includeComments: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include comments on the question')
    })
  )
  .output(
    z.object({
      questionId: z.number().describe('Unique identifier of the question'),
      title: z.string().describe('Title of the question'),
      link: z.string().describe('URL to the question'),
      body: z.string().optional().describe('HTML body of the question'),
      score: z.number().describe('Net vote score'),
      answerCount: z.number().describe('Number of answers'),
      viewCount: z.number().describe('Number of views'),
      isAnswered: z.boolean().describe('Whether the question has an accepted/upvoted answer'),
      tags: z.array(z.string()).describe('Tags on the question'),
      creationDate: z.string().describe('When the question was created (ISO 8601)'),
      lastActivityDate: z
        .string()
        .optional()
        .describe('When the question last had activity (ISO 8601)'),
      ownerDisplayName: z.string().optional().describe('Display name of the author'),
      ownerUserId: z.number().optional().describe('User ID of the author'),
      answersHasMore: z
        .boolean()
        .optional()
        .describe('Whether the included answers have another page'),
      commentsHasMore: z
        .boolean()
        .optional()
        .describe('Whether the included comments have another page'),
      answers: z.array(answerSchema).optional().describe('Answers to the question'),
      comments: z.array(commentSchema).optional().describe('Comments on the question')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      key: ctx.auth.key,
      site: ctx.config.site
    });

    let questionResult = await client.getQuestionsByIds([ctx.input.questionId]);
    let q = questionResult.items[0];
    if (!q) {
      throw createApiServiceError(`Question with ID ${ctx.input.questionId} not found.`);
    }

    let answers: any[] | undefined;
    let answersHasMore: boolean | undefined;
    let commentsHasMore: boolean | undefined;
    if (ctx.input.includeAnswers) {
      let answersResult = await client.getQuestionAnswers(ctx.input.questionId, {
        page: ctx.input.answersPage,
        pageSize: ctx.input.answersPageSize ?? 30
      });
      answersHasMore = answersResult.hasMore;
      answers = answersResult.items.map((a: any) => ({
        answerId: a.answer_id,
        score: a.score,
        isAccepted: a.is_accepted,
        body: a.body,
        creationDate: providerDate(a.creation_date),
        ownerDisplayName: a.owner?.display_name,
        ownerUserId: a.owner?.user_id
      }));
    }

    let comments: any[] | undefined;
    if (ctx.input.includeComments) {
      let commentsResult = await client.getQuestionComments(ctx.input.questionId, {
        page: ctx.input.commentsPage,
        pageSize: ctx.input.commentsPageSize ?? 30
      });
      commentsHasMore = commentsResult.hasMore;
      comments = commentsResult.items.map((c: any) => ({
        commentId: c.comment_id,
        score: c.score,
        body: c.body,
        creationDate: providerDate(c.creation_date),
        ownerDisplayName: c.owner?.display_name,
        ownerUserId: c.owner?.user_id
      }));
    }

    let output = {
      questionId: q.question_id,
      title: q.title,
      link: q.link,
      body: q.body,
      score: q.score,
      answerCount: q.answer_count,
      viewCount: q.view_count,
      isAnswered: q.is_answered,
      tags: q.tags,
      creationDate: providerDate(q.creation_date),
      lastActivityDate: optionalProviderDate(q.last_activity_date),
      ownerDisplayName: q.owner?.display_name,
      ownerUserId: q.owner?.user_id,
      answers,
      comments,
      answersHasMore,
      commentsHasMore
    };

    return {
      output,
      message: `Retrieved question **"${q.title}"** (score: ${q.score}, ${q.answer_count} answers, ${q.view_count} views).`
    };
  })
  .build();
