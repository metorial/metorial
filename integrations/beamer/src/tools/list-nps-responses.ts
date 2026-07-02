import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let npsResponseSchema = z.object({
  npsId: z.number().describe('Unique NPS response ID'),
  date: z.string().describe('Response date (ISO-8601)'),
  score: z.number().describe('NPS score (0-10)'),
  feedback: z.string().nullable().describe('Optional feedback text'),
  userId: z.string().nullable().describe('User ID of the respondent'),
  userEmail: z.string().nullable().describe('Email of the respondent'),
  userFirstName: z.string().nullable().describe('First name'),
  userLastName: z.string().nullable().describe('Last name')
});

export let listNpsResponsesTool = SlateTool.create(spec, {
  name: 'List NPS Responses',
  key: 'list_nps_responses',
  description: `Retrieve NPS (Net Promoter Score) survey responses. Filter by date range, score range, and search feedback text. Useful for analyzing customer satisfaction trends.`,
  instructions: [
    'Use scoreFrom and scoreTo to filter by score range (0-10).',
    'Scores 0-6 are detractors, 7-8 are passives, 9-10 are promoters.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      dateFrom: z.string().optional().describe('Return responses after this date (ISO-8601)'),
      dateTo: z.string().optional().describe('Return responses before this date (ISO-8601)'),
      scoreFrom: z.number().optional().describe('Minimum score (0-10)'),
      scoreTo: z.number().optional().describe('Maximum score (0-10)'),
      search: z.string().optional().describe('Search in feedback text and user names'),
      maxResults: z.number().optional().describe('Max results per page (max 100)'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      responses: z.array(npsResponseSchema).describe('List of NPS responses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let responses = await client.listNpsResponses({
      dateFrom: ctx.input.dateFrom,
      dateTo: ctx.input.dateTo,
      scoreFrom: ctx.input.scoreFrom,
      scoreTo: ctx.input.scoreTo,
      search: ctx.input.search,
      maxResults: ctx.input.maxResults,
      page: ctx.input.page
    });

    let output = responses.map(r => ({
      npsId: r.id,
      date: r.date,
      score: r.score,
      feedback: r.feedback,
      userId: r.userId,
      userEmail: r.userEmail,
      userFirstName: r.userFirstName,
      userLastName: r.userLastName
    }));

    return {
      output: { responses: output },
      message: `Found **${output.length}** NPS response(s).${ctx.input.page ? ` Page ${ctx.input.page}.` : ''}`
    };
  })
  .build();
