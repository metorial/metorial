import { SlateTool } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
import { spec } from '../spec';

export let addJobComment = SlateTool.create(spec, {
  name: 'Add Job Comment',
  key: 'add_job_comment',
  description: `Add a comment or activity entry to a job. Also supports retrieving existing activity entries/comments on a job.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      jobId: z.number().describe('ID of the job'),
      comment: z
        .string()
        .optional()
        .describe('Comment text to add. If omitted, only retrieves existing entries.'),
      activityEntryTypeId: z.number().optional().describe('Type of activity entry')
    })
  )
  .output(
    z.object({
      activityEntries: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Existing activity entries on the job'),
      newEntry: z
        .record(z.string(), z.any())
        .optional()
        .describe('The newly created activity entry')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StreamtimeClient({ token: ctx.auth.token });

    let output: Record<string, any> = {};

    if (ctx.input.comment) {
      let body: Record<string, any> = {
        comment: ctx.input.comment
      };
      if (ctx.input.activityEntryTypeId !== undefined) {
        body.activityEntryTypeId = ctx.input.activityEntryTypeId;
      }
      output.newEntry = await client.createJobActivityEntry(ctx.input.jobId, body);
    }

    output.activityEntries = await client.listJobActivityEntries(ctx.input.jobId);

    return {
      output: output as any,
      message: ctx.input.comment
        ? `Added comment to job ${ctx.input.jobId}. Found **${output.activityEntries?.length ?? 0}** total entries.`
        : `Retrieved **${output.activityEntries?.length ?? 0}** activity entries for job ${ctx.input.jobId}.`
    };
  })
  .build();
