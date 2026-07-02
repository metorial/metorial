import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let questionSummary = z.object({
  questionId: z.number(),
  title: z.string(),
  link: z.string(),
  score: z.number(),
  answerCount: z.number(),
  viewCount: z.number(),
  tags: z.array(z.string()),
  creationDate: z.string()
});

let answerSummary = z.object({
  answerId: z.number(),
  questionId: z.number(),
  score: z.number(),
  isAccepted: z.boolean(),
  creationDate: z.string()
});

export let getUserActivity = SlateTool.create(spec, {
  name: 'Get User Activity',
  key: 'get_user_activity',
  description: `Retrieve a user's recent questions, answers, or reputation changes. Useful for reviewing a user's contributions and activity history on a Stack Exchange site.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('User ID to look up'),
      activityType: z
        .enum(['questions', 'answers', 'reputation'])
        .describe('Type of activity to retrieve'),
      sort: z
        .enum(['activity', 'creation', 'votes'])
        .optional()
        .describe('How to sort results'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      page: z.number().optional().describe('Page number (1-indexed)'),
      pageSize: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      questions: z.array(questionSummary).optional().describe("User's questions"),
      answers: z.array(answerSummary).optional().describe("User's answers"),
      reputationChanges: z
        .array(
          z.object({
            postId: z.number().optional(),
            reputationChange: z.number().describe('Amount of reputation change'),
            voteType: z.string().optional().describe('Type of vote that caused the change'),
            onDate: z.string().describe('When the change occurred (ISO 8601)')
          })
        )
        .optional()
        .describe("User's reputation changes"),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      key: ctx.auth.key,
      site: ctx.config.site
    });

    let { userId, activityType, sort, order, page, pageSize } = ctx.input;

    if (activityType === 'questions') {
      let result = await client.getUserQuestions(userId, { sort, order, page, pageSize });
      let questions = result.items.map((q: any) => ({
        questionId: q.question_id,
        title: q.title,
        link: q.link,
        score: q.score,
        answerCount: q.answer_count,
        viewCount: q.view_count,
        tags: q.tags ?? [],
        creationDate: new Date(q.creation_date * 1000).toISOString()
      }));
      return {
        output: { questions, hasMore: result.hasMore },
        message: `Retrieved **${questions.length}** question(s) by user **#${userId}**.`
      };
    }

    if (activityType === 'answers') {
      let result = await client.getUserAnswers(userId, { sort, order, page, pageSize });
      let answers = result.items.map((a: any) => ({
        answerId: a.answer_id,
        questionId: a.question_id,
        score: a.score,
        isAccepted: a.is_accepted ?? false,
        creationDate: new Date(a.creation_date * 1000).toISOString()
      }));
      return {
        output: { answers, hasMore: result.hasMore },
        message: `Retrieved **${answers.length}** answer(s) by user **#${userId}**.`
      };
    }

    // reputation
    let result = await client.getUserReputation(userId, { page, pageSize });
    let reputationChanges = result.items.map((r: any) => ({
      postId: r.post_id,
      reputationChange: r.reputation_change,
      voteType: r.vote_type,
      onDate: new Date(r.on_date * 1000).toISOString()
    }));
    return {
      output: { reputationChanges, hasMore: result.hasMore },
      message: `Retrieved **${reputationChanges.length}** reputation change(s) for user **#${userId}**.`
    };
  })
  .build();
