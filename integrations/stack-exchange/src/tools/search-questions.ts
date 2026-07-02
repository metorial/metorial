import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let questionSchema = z.object({
  questionId: z.number().describe('Unique identifier of the question'),
  title: z.string().describe('Title of the question'),
  link: z.string().describe('URL to the question on the site'),
  score: z.number().describe('Net vote score of the question'),
  answerCount: z.number().describe('Number of answers posted'),
  viewCount: z.number().describe('Number of times the question has been viewed'),
  isAnswered: z.boolean().describe('Whether the question has an accepted or upvoted answer'),
  tags: z.array(z.string()).describe('Tags associated with the question'),
  creationDate: z.string().describe('When the question was created (ISO 8601)'),
  lastActivityDate: z
    .string()
    .optional()
    .describe('When the question last had activity (ISO 8601)'),
  ownerDisplayName: z.string().optional().describe('Display name of the question author'),
  ownerUserId: z.number().optional().describe('User ID of the question author'),
  body: z.string().optional().describe('HTML body of the question (when available)')
});

export let searchQuestions = SlateTool.create(spec, {
  name: 'Search Questions',
  key: 'search_questions',
  description: `Search for questions across a Stack Exchange site using keywords, tags, and advanced filters. Supports both basic title-based search and advanced full-text search with criteria like accepted answer status, minimum answers/views, and date ranges.`,
  instructions: [
    'Use semicolons to separate multiple tags (e.g., "javascript;typescript").',
    'For broad keyword search use the "query" field; for title-specific search use "inTitle".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Free-form search text across question content'),
      inTitle: z.string().optional().describe('Search only within question titles'),
      tagged: z
        .string()
        .optional()
        .describe('Semicolon-delimited tags to filter by (e.g., "python;django")'),
      notTagged: z.string().optional().describe('Semicolon-delimited tags to exclude'),
      hasAcceptedAnswer: z
        .boolean()
        .optional()
        .describe('Filter to questions with/without an accepted answer'),
      isClosed: z.boolean().optional().describe('Filter to closed/open questions'),
      minAnswers: z.number().optional().describe('Minimum number of answers'),
      minViews: z.number().optional().describe('Minimum number of views'),
      fromDate: z
        .string()
        .optional()
        .describe('Only return questions created after this date (ISO 8601)'),
      toDate: z
        .string()
        .optional()
        .describe('Only return questions created before this date (ISO 8601)'),
      sort: z
        .enum(['activity', 'creation', 'votes', 'relevance'])
        .optional()
        .describe('How to sort results'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      page: z.number().optional().describe('Page number (1-indexed)'),
      pageSize: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      questions: z.array(questionSchema).describe('List of matching questions'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      key: ctx.auth.key,
      site: ctx.config.site
    });

    let useAdvanced = !!(
      ctx.input.query ||
      ctx.input.hasAcceptedAnswer !== undefined ||
      ctx.input.isClosed !== undefined ||
      ctx.input.minAnswers ||
      ctx.input.minViews ||
      ctx.input.fromDate ||
      ctx.input.toDate
    );

    let result: any;
    if (useAdvanced) {
      result = await client.searchAdvanced({
        query: ctx.input.query,
        title: ctx.input.inTitle,
        tagged: ctx.input.tagged,
        notTagged: ctx.input.notTagged,
        accepted: ctx.input.hasAcceptedAnswer,
        closed: ctx.input.isClosed,
        minAnswers: ctx.input.minAnswers,
        minViews: ctx.input.minViews,
        fromDate: ctx.input.fromDate,
        toDate: ctx.input.toDate,
        sort: ctx.input.sort,
        order: ctx.input.order,
        page: ctx.input.page,
        pageSize: ctx.input.pageSize
      });
    } else {
      result = await client.search({
        inTitle: ctx.input.inTitle ?? ctx.input.query,
        tagged: ctx.input.tagged,
        notTagged: ctx.input.notTagged,
        sort: ctx.input.sort,
        order: ctx.input.order,
        page: ctx.input.page,
        pageSize: ctx.input.pageSize
      });
    }

    let questions = result.items.map((q: any) => ({
      questionId: q.question_id,
      title: q.title,
      link: q.link,
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
      body: q.body
    }));

    return {
      output: { questions, hasMore: result.hasMore },
      message: `Found **${questions.length}** questions${result.hasMore ? ' (more available)' : ''}.`
    };
  })
  .build();
