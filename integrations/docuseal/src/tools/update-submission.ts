import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const updateSubmission = SlateTool.create(spec, {
  key: 'update_submission',
  name: 'Update Submission',
  description:
    'Rename a submission, change or remove its expiration, or archive and restore it. Archival retains documents and history; expiration restricts signing availability and does not undo completed signatures.'
})
  .input(
    z.object({
      submissionId: z.number().describe('Exact submission ID'),
      name: z.string().optional().describe('New name'),
      expireAt: z
        .string()
        .nullable()
        .optional()
        .describe('Unambiguous date-time with timezone; null removes expiration'),
      archived: z
        .boolean()
        .optional()
        .describe('true archives; false restores. History remains retained')
    })
  )
  .output(
    z.object({
      submissionId: z.number(),
      name: z.string().nullable().optional(),
      expireAt: z.string().nullable().optional(),
      archivedAt: z.string().nullable().optional(),
      status: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    const result = await client.updateSubmission(ctx.input.submissionId, {
      name: ctx.input.name,
      expireAt: ctx.input.expireAt,
      archived: ctx.input.archived
    });
    return {
      output: {
        submissionId: result.id,
        name: result.name,
        expireAt: result.expire_at,
        archivedAt: result.archived_at,
        status: result.status
      },
      message: `Updated submission ${result.id}; archival retains its history.`
    };
  })
  .build();
