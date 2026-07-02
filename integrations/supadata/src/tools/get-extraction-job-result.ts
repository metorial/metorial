import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getExtractionJobResult = SlateTool.create(spec, {
  name: 'Get Extraction Job Result',
  key: 'get_extraction_job_result',
  description: `Retrieve the result of an asynchronous structured data extraction job. Use this when the "Extract Structured Data from Video" tool returns a job ID.
Poll until the status is "completed" or "failed".`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('Job ID returned from the extraction request')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Job status (e.g. "processing", "completed", "failed")'),
      extractedData: z
        .any()
        .optional()
        .describe('Extracted structured data when job is completed'),
      schema: z
        .record(z.string(), z.any())
        .optional()
        .describe('JSON Schema used or auto-generated for the extraction')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getExtractionResult(ctx.input.jobId);

    return {
      output: {
        status: result.status,
        extractedData: result.data ?? result.result,
        schema: result.schema
      },
      message:
        result.status === 'completed'
          ? `Extraction job completed successfully.`
          : `Extraction job status: **${result.status}**. ${result.status === 'processing' ? 'Try again shortly.' : ''}`
    };
  })
  .build();
