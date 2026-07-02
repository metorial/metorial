import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSubmitters = SlateTool.create(spec, {
  name: 'List Submitters',
  key: 'list_submitters',
  description: `List submitters (signers) across submissions. Filter by submission, completion date range, external ID, or search query. Returns submitter details including status, filled values, and signed documents.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      submissionId: z.number().optional().describe('Filter by submission ID'),
      query: z.string().optional().describe('Search by submitter name, email, or phone'),
      completedAfter: z
        .string()
        .optional()
        .describe('Filter by completion date (ISO 8601): completed after this date'),
      completedBefore: z
        .string()
        .optional()
        .describe('Filter by completion date (ISO 8601): completed before this date'),
      externalId: z.string().optional().describe('Filter by external ID'),
      limit: z.number().optional().describe('Number of results (max 100, default 10)'),
      after: z
        .number()
        .optional()
        .describe('Cursor for pagination: return submitters after this ID'),
      before: z
        .number()
        .optional()
        .describe('Cursor for pagination: return submitters before this ID')
    })
  )
  .output(
    z.object({
      submitters: z
        .array(
          z.object({
            submitterId: z.number().describe('Submitter ID'),
            submissionId: z.number().optional().describe('Submission ID'),
            email: z.string().optional().describe('Submitter email'),
            name: z.string().nullable().optional().describe('Submitter name'),
            phone: z.string().nullable().optional().describe('Submitter phone'),
            status: z.string().optional().describe('Submitter status'),
            role: z.string().optional().describe('Submitter role'),
            externalId: z.string().nullable().optional().describe('External ID'),
            completedAt: z.string().nullable().optional().describe('Completion timestamp'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of submitters')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let data = await client.listSubmitters({
      submissionId: ctx.input.submissionId,
      q: ctx.input.query,
      completedAfter: ctx.input.completedAfter,
      completedBefore: ctx.input.completedBefore,
      externalId: ctx.input.externalId,
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });

    let items = Array.isArray(data) ? data : data.data || [];
    let submitters = items.map((s: any) => ({
      submitterId: s.id,
      submissionId: s.submission_id,
      email: s.email,
      name: s.name,
      phone: s.phone,
      status: s.status,
      role: s.role,
      externalId: s.external_id,
      completedAt: s.completed_at,
      createdAt: s.created_at
    }));

    return {
      output: { submitters },
      message: `Found **${submitters.length}** submitter(s).`
    };
  })
  .build();
