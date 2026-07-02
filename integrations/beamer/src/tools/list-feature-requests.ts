import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { featureRequestOutputSchema } from './create-feature-request';

export let listFeatureRequestsTool = SlateTool.create(spec, {
  name: 'List Feature Requests',
  key: 'list_feature_requests',
  description: `Search and list Beamer feature requests with optional filters. Filter by status, category, date range, visibility, and text search. Supports pagination.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      filters: z.string().optional().describe('Segmentation filter'),
      dateFrom: z.string().optional().describe('Return requests after this date (ISO-8601)'),
      dateTo: z.string().optional().describe('Return requests before this date (ISO-8601)'),
      language: z.string().optional().describe('ISO-639 language code'),
      category: z.string().optional().describe('Filter by category'),
      status: z
        .string()
        .optional()
        .describe(
          'Filter by status (e.g., "under_review", "planned", "in_progress", "complete")'
        ),
      visible: z.boolean().optional().describe('Filter by visibility'),
      search: z.string().optional().describe('Search in title and content'),
      maxResults: z.number().optional().describe('Max results per page'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      featureRequests: z
        .array(featureRequestOutputSchema)
        .describe('List of matching feature requests')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let requests = await client.listFeatureRequests({
      filters: ctx.input.filters,
      dateFrom: ctx.input.dateFrom,
      dateTo: ctx.input.dateTo,
      language: ctx.input.language,
      category: ctx.input.category,
      status: ctx.input.status,
      visible: ctx.input.visible,
      search: ctx.input.search,
      maxResults: ctx.input.maxResults,
      page: ctx.input.page
    });

    let output = requests.map(request => ({
      requestId: request.id,
      date: request.date,
      visible: request.visible,
      category: request.category,
      status: request.status,
      translations: request.translations ?? [],
      votesCount: request.votesCount,
      commentsCount: request.commentsCount,
      notes: request.notes,
      filters: request.filters,
      userId: request.userId,
      userEmail: request.userEmail,
      userFirstname: request.userFirstname,
      userLastname: request.userLastname
    }));

    return {
      output: { featureRequests: output },
      message: `Found **${output.length}** feature request(s).${ctx.input.page ? ` Page ${ctx.input.page}.` : ''}`
    };
  })
  .build();
