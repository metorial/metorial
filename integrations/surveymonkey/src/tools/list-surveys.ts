import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSurveys = SlateTool.create(spec, {
  name: 'List Surveys',
  key: 'list_surveys',
  description: `Retrieve a paginated list of surveys owned by or shared with the authenticated user. Supports filtering by title and modification date, and sorting by various fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number to return (default: 1)'),
      perPage: z.number().optional().describe('Number of surveys per page'),
      sortBy: z
        .enum(['title', 'date_modified', 'num_responses'])
        .optional()
        .describe('Field to sort by'),
      sortOrder: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
      title: z.string().optional().describe('Filter by survey title (partial match)'),
      startModifiedAt: z
        .string()
        .optional()
        .describe('Filter surveys modified after this date (YYYY-MM-DDTHH:MM:SS)'),
      endModifiedAt: z
        .string()
        .optional()
        .describe('Filter surveys modified before this date (YYYY-MM-DDTHH:MM:SS)'),
      folderId: z.string().optional().describe('Filter by folder ID')
    })
  )
  .output(
    z.object({
      surveys: z.array(
        z.object({
          surveyId: z.string(),
          title: z.string(),
          href: z.string()
        })
      ),
      page: z.number(),
      total: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accessUrl: ctx.auth.accessUrl
    });

    let result = await client.listSurveys({
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      sortBy: ctx.input.sortBy,
      sortOrder: ctx.input.sortOrder,
      title: ctx.input.title,
      startModifiedAt: ctx.input.startModifiedAt,
      endModifiedAt: ctx.input.endModifiedAt,
      folderId: ctx.input.folderId,
      include: 'response_count,date_modified,date_created'
    });

    let surveys = (result.data || []).map((s: any) => ({
      surveyId: s.id,
      title: s.title,
      href: s.href
    }));

    return {
      output: {
        surveys,
        page: result.page || 1,
        total: result.total || surveys.length
      },
      message: `Found **${result.total || surveys.length}** surveys (page ${result.page || 1}).`
    };
  })
  .build();
