import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPartialSubmissions = SlateTool.create(spec, {
  name: 'List Partial Submissions',
  key: 'list_partial_submissions',
  description: `List partial (incomplete) submissions for a form. These are responses that were started but not completed. Partial submission data is retained for 30 days after each drop-off.`,
  constraints: ['Partial submissions are only stored for 30 days.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formSlugOrId: z.string().describe('The form slug, custom slug, or unique ID'),
      limit: z
        .number()
        .optional()
        .describe('Number of results to return (max 100, default 20)'),
      skip: z.number().optional().describe('Number of results to skip for pagination'),
      sort: z
        .enum(['ASC', 'DESC'])
        .optional()
        .describe('Sort direction by creation date (default DESC)')
    })
  )
  .output(
    z.object({
      partialSubmissions: z.array(
        z.object({
          submissionId: z.string().describe('Unique partial submission ID'),
          formId: z.string().describe('Associated form ID'),
          formData: z.record(z.string(), z.unknown()).describe('Partial form answers'),
          createdAt: z.string().describe('Creation timestamp (UTC)'),
          updatedAt: z.string().describe('Last update timestamp (UTC)')
        })
      ),
      total: z.number().describe('Total number of partial submissions'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listPartialSubmissions(ctx.input.formSlugOrId, {
      limit: ctx.input.limit,
      skip: ctx.input.skip,
      sort: ctx.input.sort
    });

    let partialSubmissions = result.results.map(s => ({
      submissionId: s.id,
      formId: s.form_id,
      formData: s.data,
      createdAt: s.created_at_utc,
      updatedAt: s.updated_at_utc
    }));

    return {
      output: {
        partialSubmissions,
        total: result.total,
        hasMore: result.has_more
      },
      message: `Found **${result.total}** partial submission(s). Returned **${partialSubmissions.length}** result(s).`
    };
  })
  .build();
