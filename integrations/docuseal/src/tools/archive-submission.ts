import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let archiveSubmission = SlateTool.create(spec, {
  name: 'Archive Submission',
  key: 'archive_submission',
  description: `Archive a submission, removing it from active listings while preserving the data.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      submissionId: z.number().describe('ID of the submission to archive')
    })
  )
  .output(
    z.object({
      submissionId: z.number().describe('Archived submission ID'),
      archivedAt: z.string().describe('Archive timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.archiveSubmission(ctx.input.submissionId);

    return {
      output: {
        submissionId: result.id,
        archivedAt: result.archived_at
      },
      message: `Archived submission ID **${result.id}**.`
    };
  })
  .build();
