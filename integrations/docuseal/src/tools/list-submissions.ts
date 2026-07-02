import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSubmissions = SlateTool.create(spec, {
  name: 'List Submissions',
  key: 'list_submissions',
  description: `List signature requests (submissions). Filter by template, status, submitter details, or folder. Returns submission metadata and submitter statuses.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.number().optional().describe('Filter by template ID'),
      status: z
        .enum(['pending', 'completed', 'declined', 'expired'])
        .optional()
        .describe('Filter by submission status'),
      query: z.string().optional().describe('Search by submitter name, email, or phone'),
      slug: z.string().optional().describe('Filter by submission slug'),
      templateFolder: z.string().optional().describe('Filter by template folder name'),
      archived: z.boolean().optional().describe('Set true to list archived submissions'),
      limit: z.number().optional().describe('Number of results (max 100, default 10)'),
      after: z
        .number()
        .optional()
        .describe('Cursor for pagination: return submissions after this ID'),
      before: z
        .number()
        .optional()
        .describe('Cursor for pagination: return submissions before this ID')
    })
  )
  .output(
    z.object({
      submissions: z
        .array(
          z.object({
            submissionId: z.number().describe('Submission ID'),
            slug: z.string().optional().describe('Submission slug'),
            status: z.string().optional().describe('Submission status'),
            templateId: z.number().optional().describe('Template ID'),
            createdAt: z.string().describe('Creation timestamp'),
            completedAt: z.string().nullable().optional().describe('Completion timestamp'),
            archivedAt: z.string().nullable().optional().describe('Archived timestamp'),
            submitters: z
              .array(
                z.object({
                  submitterId: z.number().describe('Submitter ID'),
                  email: z.string().optional().describe('Submitter email'),
                  name: z.string().nullable().optional().describe('Submitter name'),
                  status: z.string().optional().describe('Submitter status'),
                  role: z.string().optional().describe('Submitter role')
                })
              )
              .optional()
              .describe('Submitters in this submission')
          })
        )
        .describe('List of submissions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let data = await client.listSubmissions({
      templateId: ctx.input.templateId,
      status: ctx.input.status,
      q: ctx.input.query,
      slug: ctx.input.slug,
      templateFolder: ctx.input.templateFolder,
      archived: ctx.input.archived,
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });

    let items = Array.isArray(data) ? data : data.data || [];
    let submissions = items.map((s: any) => ({
      submissionId: s.id,
      slug: s.slug,
      status: s.status,
      templateId: s.template?.id || s.template_id,
      createdAt: s.created_at,
      completedAt: s.completed_at,
      archivedAt: s.archived_at,
      submitters: (s.submitters || []).map((sub: any) => ({
        submitterId: sub.id,
        email: sub.email,
        name: sub.name,
        status: sub.status,
        role: sub.role
      }))
    }));

    return {
      output: { submissions },
      message: `Found **${submissions.length}** submission(s).`
    };
  })
  .build();
