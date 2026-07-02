import { SlateTool } from 'slates';
import { z } from 'zod';
import { TranscribeClient } from '../lib/client';
import { spec } from '../spec';

export let deleteCallAnalyticsJob = SlateTool.create(spec, {
  name: 'Delete Call Analytics Job',
  key: 'delete_call_analytics_job',
  description:
    'Delete a Call Analytics job and its metadata. This does not delete transcript output stored in S3.',
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      jobName: z.string().describe('Name of the Call Analytics job to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the job was deleted'),
      jobName: z.string().describe('Name of the deleted Call Analytics job')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TranscribeClient({
      credentials: {
        accessKeyId: ctx.auth.accessKeyId,
        secretAccessKey: ctx.auth.secretAccessKey,
        sessionToken: ctx.auth.sessionToken
      },
      region: ctx.config.region
    });

    await client.deleteCallAnalyticsJob(ctx.input.jobName);

    return {
      output: {
        deleted: true,
        jobName: ctx.input.jobName
      },
      message: `Deleted Call Analytics job **${ctx.input.jobName}**.`
    };
  });
