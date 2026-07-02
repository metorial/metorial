import { SlateTool } from 'slates';
import { z } from 'zod';
import { RefinerClient } from '../lib/client';
import { spec } from '../spec';

let surveySchema = z.object({
  surveyUuid: z.string().describe('UUID of the survey'),
  name: z.string().describe('Name of the survey'),
  channels: z
    .array(z.string())
    .describe('Distribution channels (e.g. "link", "web", "mobile")'),
  publishedAt: z.string().nullable().describe('ISO 8601 timestamp when published'),
  archivedAt: z.string().nullable().describe('ISO 8601 timestamp when archived'),
  createdAt: z.string().nullable().describe('ISO 8601 timestamp when created'),
  updatedAt: z.string().nullable().describe('ISO 8601 timestamp when last updated'),
  responsesCount: z.number().describe('Total number of responses'),
  viewsCount: z.number().describe('Total number of views'),
  pageUrl: z.string().nullable().describe('Public survey page URL')
});

export let listSurveys = SlateTool.create(spec, {
  name: 'List Surveys',
  key: 'list_surveys',
  description: `Retrieve surveys in your Refiner project. Filter by status (published, drafts, archived) and optionally include configuration details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['all', 'published', 'drafts', 'archived', 'all_with_archived'])
        .optional()
        .describe('Filter by survey status (default: "all")'),
      includeConfig: z.boolean().optional().describe('Include survey configuration details'),
      includeInfo: z.boolean().optional().describe('Include additional survey info'),
      page: z.number().optional().describe('Page number for pagination'),
      pageLength: z.number().optional().describe('Number of results per page (max 1000)')
    })
  )
  .output(
    z.object({
      surveys: z.array(surveySchema).describe('List of surveys'),
      pagination: z
        .object({
          itemsCount: z.number().describe('Total number of items'),
          currentPage: z.number().describe('Current page number'),
          lastPage: z.number().describe('Last page number'),
          pageLength: z.number().describe('Items per page')
        })
        .describe('Pagination information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RefinerClient({ token: ctx.auth.token });

    let result = (await client.listForms({
      list: ctx.input.status,
      includeConfig: ctx.input.includeConfig,
      includeInfo: ctx.input.includeInfo,
      page: ctx.input.page,
      pageLength: ctx.input.pageLength
    })) as any;

    let surveys = (result.items || []).map((item: any) => ({
      surveyUuid: item.uuid,
      name: item.name,
      channels: item.channels ?? [],
      publishedAt: item.published_at ?? null,
      archivedAt: item.archived_at ?? null,
      createdAt: item.created_at ?? null,
      updatedAt: item.updated_at ?? null,
      responsesCount: item.responses_count ?? 0,
      viewsCount: item.views_count ?? 0,
      pageUrl: item.page_url ?? null
    }));

    let pagination = result.pagination || {};

    return {
      output: {
        surveys,
        pagination: {
          itemsCount: pagination.items_count ?? 0,
          currentPage: pagination.current_page ?? 1,
          lastPage: pagination.last_page ?? 1,
          pageLength: pagination.page_length ?? 50
        }
      },
      message: `Found **${surveys.length}** surveys (page ${pagination.current_page ?? 1} of ${pagination.last_page ?? 1}).`
    };
  })
  .build();
