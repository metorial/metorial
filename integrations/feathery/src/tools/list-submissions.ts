import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { FeatheryClient } from '../lib/client';
import { spec } from '../spec';

export let listSubmissions = SlateTool.create(spec, {
  name: 'List Submissions',
  key: 'list_submissions',
  description: `Search and list form submissions. Filter by form, time range, completion status, field values, or fuzzy search. Supports pagination and sorting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z.string().describe('ID of the form to list submissions for'),
      startTime: z
        .string()
        .optional()
        .describe('Filter submissions after this datetime (ISO 8601)'),
      endTime: z
        .string()
        .optional()
        .describe('Filter submissions before this datetime (ISO 8601)'),
      createdAfter: z.string().optional().describe('Filter by creation date after (ISO 8601)'),
      createdBefore: z
        .string()
        .optional()
        .describe('Filter by creation date before (ISO 8601)'),
      completed: z.boolean().optional().describe('Filter by completion status'),
      fieldSearch: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value pairs to search specific field values'),
      fields: z
        .array(z.string())
        .optional()
        .describe('Specific field IDs to include in the response'),
      sort: z.string().optional().describe('Sort order for results'),
      pageSize: z.number().optional().describe('Number of results per page, from 1 to 1000'),
      pageUrl: z
        .string()
        .optional()
        .describe(
          'nextPageUrl from a previous list_submissions result for this form. Uses the filters stored in that URL.'
        )
    })
  )
  .output(
    z.object({
      submissions: z
        .array(
          z.object({
            userId: z.string().optional().describe('User ID who submitted'),
            completed: z.boolean().optional().describe('Whether the submission is complete'),
            fieldValues: z
              .record(z.string(), z.any())
              .optional()
              .describe('Submitted field values'),
            createdAt: z.string().optional().describe('When the submission was created'),
            updatedAt: z.string().optional().describe('When the submission was last updated')
          })
        )
        .describe('List of submissions'),
      count: z.number().optional().describe('Total number of matching submissions'),
      nextPageUrl: z
        .string()
        .nullable()
        .optional()
        .describe('URL to pass as pageUrl for the next page'),
      previousPageUrl: z.string().nullable().optional().describe('URL of the previous page'),
      currentPage: z.number().optional().describe('Current page number'),
      totalPages: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FeatheryClient({
      token: ctx.auth.token,
      region:
        ctx.auth.region ??
        ('region' in ctx.config && typeof ctx.config.region === 'string'
          ? ctx.config.region
          : undefined)
    });

    if (
      ctx.input.pageSize !== undefined &&
      (!Number.isInteger(ctx.input.pageSize) ||
        ctx.input.pageSize < 1 ||
        ctx.input.pageSize > 1000)
    ) {
      throw createApiServiceError('pageSize must be a whole number from 1 to 1000.');
    }
    let result = await client.listSubmissions({
      formId: ctx.input.formId,
      startTime: ctx.input.startTime,
      endTime: ctx.input.endTime,
      createdAfter: ctx.input.createdAfter,
      createdBefore: ctx.input.createdBefore,
      completed: ctx.input.completed,
      fieldSearch: ctx.input.fieldSearch,
      fields: ctx.input.fields,
      sort: ctx.input.sort,
      pageSize: ctx.input.pageSize,
      pageUrl: ctx.input.pageUrl
    });

    let submissions = Array.isArray(result) ? result : result.results || result.data || [];
    let count = Array.isArray(result) ? result.length : result.count;

    let mapped = submissions.map((s: any) => ({
      userId: s.user_id || s.feathery_user_id,
      completed: s.completed,
      fieldValues: Array.isArray(s.values)
        ? Object.fromEntries(s.values.map((field: any) => [field.id, field.value]))
        : (s.fields ?? s.field_values),
      createdAt: s.submission_start ?? s.created_at ?? undefined,
      updatedAt: s.last_submitted ?? s.updated_at ?? undefined
    }));

    return {
      output: {
        submissions: mapped,
        count,
        nextPageUrl: result.next,
        previousPageUrl: result.previous,
        currentPage: result.current_page,
        totalPages: result.total_pages
      },
      message: `Found **${count ?? mapped.length}** submission(s) for form **${ctx.input.formId}**.`
    };
  })
  .build();
