import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { spec } from '../spec';
export const listApplicationAttachmentsTool = SlateTool.create(spec, {
  key: 'list_application_attachments',
  name: 'List Application Files',
  description:
    'Discover resumes, cover letters and other files for one application. Use a returned file ID with download_application_attachment. Download links are issued separately.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      applicationId: z
        .string()
        .describe(
          'Application ID. Retain it on cursor requests so file ownership can be checked.'
        ),
      perPage: z
        .number()
        .optional()
        .describe('First-page size between 1 and 500; default 50.'),
      cursor: z
        .string()
        .optional()
        .describe('Opaque nextCursor. Omit perPage when using cursor.')
    })
  )
  .output(
    z.object({
      files: z.array(
        z.object({
          attachmentId: z.string(),
          applicationId: z.string(),
          candidateId: z.string().nullable().optional(),
          fileName: z.string().optional(),
          type: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      ),
      hasMore: z.boolean(),
      nextCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const page = await new GreenhouseClient(ctx.auth, ctx.config).listApplicationAttachments(
      ctx.input
    );
    return {
      output: {
        files: page.items.map(row => ({
          attachmentId: String(row.id),
          applicationId: String(row.application_id),
          candidateId:
            row.candidate_id === undefined || row.candidate_id === null
              ? row.candidate_id
              : String(row.candidate_id),
          fileName: row.filename,
          type: row.type,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        })),
        hasMore: page.hasMore,
        nextCursor: page.nextCursor
      },
      message: `Retrieved ${page.items.length} application file(s).`
    };
  })
  .build();
