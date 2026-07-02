import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let transcriptChunkSchema = z.object({
  text: z.string().describe('Transcript text segment'),
  offset: z.number().describe('Start time offset in milliseconds'),
  duration: z.number().describe('Duration of segment in milliseconds'),
  lang: z.string().optional().describe('Language code of the segment')
});

export let getTranscriptJobResult = SlateTool.create(spec, {
  name: 'Get Transcript Job Result',
  key: 'get_transcript_job_result',
  description: `Retrieve the result of an asynchronous transcript job. Use this when the "Get Video Transcript" tool returns a job ID instead of immediate content.
Poll this endpoint until the job status is "completed" or "failed".`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('Job ID returned from the transcript request')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Job status (e.g. "processing", "completed", "failed")'),
      content: z
        .union([z.array(transcriptChunkSchema), z.string()])
        .optional()
        .describe('Transcript content when job is completed'),
      lang: z.string().optional().describe('Language of the returned transcript'),
      availableLangs: z.array(z.string()).optional().describe('Available language codes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getTranscriptResult(ctx.input.jobId);

    return {
      output: {
        status: result.status,
        content: result.content,
        lang: result.lang,
        availableLangs: result.availableLangs
      },
      message:
        result.status === 'completed'
          ? `Transcript job completed successfully.`
          : `Transcript job status: **${result.status}**. ${result.status === 'processing' ? 'Try again shortly.' : ''}`
    };
  })
  .build();
