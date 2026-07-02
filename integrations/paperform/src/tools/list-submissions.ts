import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSubmissions = SlateTool.create(spec, {
  name: 'List Submissions',
  key: 'list_submissions',
  description: `List submissions for a Paperform form. Returns submission IDs, form data, device info, payment details, and timestamps. Supports pagination and date filtering to retrieve specific time ranges of submissions.`,
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
        .describe('Sort direction by creation date (default DESC)'),
      beforeDate: z
        .string()
        .optional()
        .describe('Return results created before this UTC date-time'),
      afterDate: z
        .string()
        .optional()
        .describe('Return results created after this UTC date-time')
    })
  )
  .output(
    z.object({
      submissions: z.array(
        z.object({
          submissionId: z.string().describe('Unique submission ID'),
          formId: z.string().describe('Associated form ID'),
          formData: z
            .record(z.string(), z.unknown())
            .describe('Form answers keyed by field identifier'),
          device: z
            .record(z.string(), z.unknown())
            .describe('Device information from submission'),
          charge: z
            .record(z.string(), z.unknown())
            .nullable()
            .describe('Payment details if applicable'),
          createdAt: z.string().describe('Submission timestamp (UTC)')
        })
      ),
      total: z.number().describe('Total number of submissions'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listSubmissions(ctx.input.formSlugOrId, {
      limit: ctx.input.limit,
      skip: ctx.input.skip,
      sort: ctx.input.sort,
      beforeDate: ctx.input.beforeDate,
      afterDate: ctx.input.afterDate
    });

    let submissions = result.results.map(s => ({
      submissionId: s.id,
      formId: s.form_id,
      formData: s.data,
      device: s.device,
      charge: s.charge,
      createdAt: s.created_at_utc
    }));

    return {
      output: {
        submissions,
        total: result.total,
        hasMore: result.has_more
      },
      message: `Found **${result.total}** submission(s). Returned **${submissions.length}** result(s).`
    };
  })
  .build();
