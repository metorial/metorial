import { SlateTool } from 'slates';
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
      pageSize: z.number().optional().describe('Number of results per page')
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
      count: z.number().optional().describe('Total number of matching submissions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FeatheryClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

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
      pageSize: ctx.input.pageSize
    });

    let submissions = Array.isArray(result) ? result : result.results || result.data || [];
    let count = Array.isArray(result) ? result.length : result.count;

    let mapped = submissions.map((s: any) => ({
      userId: s.user_id || s.feathery_user_id,
      completed: s.completed,
      fieldValues: s.fields || s.field_values,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }));

    return {
      output: { submissions: mapped, count },
      message: `Found **${count ?? mapped.length}** submission(s) for form **${ctx.input.formId}**.`
    };
  })
  .build();
