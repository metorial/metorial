import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
  description: `Retrieve a question by its ID along with its answers and comments. Returns the full question details including body, score, tags, and optionally linked/related questions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      questionId: z.string().describe('The ID of the question to retrieve'),
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
      throw new Error(`Question with ID ${ctx.input.questionId} not found.`);
    }

    let answers: any[] | undefined;
    if (ctx.input.includeAnswers) {
      let answersResult = await client.getQuestionAnswers(ctx.input.questionId, {
        pageSize: 30
      });
      answers = answersResult.items.map((a: any) => ({
        answerId: a.answer_id,
        score: a.score,
        isAccepted: a.is_accepted ?? false,
        body: a.body,
        creationDate: new Date(a.creation_date * 1000).toISOString(),
        ownerDisplayName: a.owner?.display_name,
        ownerUserId: a.owner?.user_id
      }));
    }

    let comments: any[] | undefined;
    if (ctx.input.includeComments) {
      let commentsResult = await client.getQuestionComments(ctx.input.questionId, {
        pageSize: 30
      });
      comments = commentsResult.items.map((c: any) => ({
        commentId: c.comment_id,
        score: c.score,
        body: c.body,
        creationDate: new Date(c.creation_date * 1000).toISOString(),
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
      tags: q.tags ?? [],
      creationDate: new Date(q.creation_date * 1000).toISOString(),
      lastActivityDate: q.last_activity_date
        ? new Date(q.last_activity_date * 1000).toISOString()
        : undefined,
      ownerDisplayName: q.owner?.display_name,
      ownerUserId: q.owner?.user_id,
      answers,
      comments
    };

    return {
      output,
      message: `Retrieved question **"${q.title}"** (score: ${q.score}, ${q.answer_count} answers, ${q.view_count} views).`
    };
  })
  .build();
