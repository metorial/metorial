import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let extractStructuredData = SlateTool.create(spec, {
  name: 'Extract Structured Data from Video',
  key: 'extract_structured_data',
  description: `Use AI to extract structured data from video content. Analyzes what is seen and heard in the video (visuals, audio, context).
Provide a natural language prompt, a JSON Schema for the output, or both. Always processes asynchronously — returns a job ID to poll for results.
When only a prompt is provided, the AI auto-generates a schema which is returned for reuse.`,
  instructions: [
    'Provide at least a prompt or a schema (or both). The prompt describes what data to extract, the schema defines the output structure.',
    'Use the "Get Extraction Job Result" tool to poll for the completed result.'
  ],
  constraints: [
    'File URL support is limited to 200 MB and 55-minute maximum duration.',
    'Does not retrieve transcripts or platform metrics — analyzes video content directly.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z
        .string()
        .describe(
          'URL of the video to analyze (YouTube, TikTok, Instagram, X, Facebook, or direct file URL)'
        ),
      prompt: z
        .string()
        .optional()
        .describe('Natural language description of what data to extract from the video'),
      schema: z
        .record(z.string(), z.any())
        .optional()
        .describe('JSON Schema defining the desired output structure')
    })
  )
  .output(
    z.object({
      jobId: z
        .string()
        .describe('Job ID for the async extraction — poll with "Get Extraction Job Result"')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createExtraction({
      url: ctx.input.url,
      prompt: ctx.input.prompt,
      schema: ctx.input.schema
    });

    return {
      output: {
        jobId: result.jobId
      },
      message: `Extraction job created. Job ID: **${result.jobId}**. Use "Get Extraction Job Result" to check the status.`
    };
  })
  .build();
