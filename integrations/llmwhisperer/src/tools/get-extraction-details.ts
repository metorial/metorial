import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getExtractionDetails = SlateTool.create(spec, {
  name: 'Get Extraction Details',
  key: 'get_extraction_details',
  description:
    'Get processing metrics for a document extraction job, including its mode, tag, page counts, file size, and processing timestamps. Use the whisper hash returned by Extract Document.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      whisperHash: z.string().min(1).describe('The whisper hash returned by Extract Document.')
    })
  )
  .output(
    z.object({
      whisperHash: z.string().describe('Extraction job identifier.'),
      mode: z.string().describe('Extraction mode used for this job.'),
      tag: z.string().describe('Tag supplied when the job was submitted.'),
      completedAt: z.string().nullable().describe('Completion timestamp, when available.'),
      processingStartedAt: z
        .string()
        .nullable()
        .describe('Processing start timestamp, when available.'),
      processingTimeInSeconds: z
        .number()
        .nullable()
        .describe('Total processing duration in seconds, when available.'),
      processedPages: z
        .number()
        .nullable()
        .describe('Number of pages processed, when available.'),
      requestedPages: z
        .number()
        .nullable()
        .describe('Number of pages requested for processing, when available.'),
      totalPages: z
        .number()
        .nullable()
        .describe('Total number of pages in the source document, when available.'),
      uploadFileSizeInKb: z
        .number()
        .nullable()
        .describe('Uploaded document size in kilobytes, when available.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let output = await client.getWhisperDetails(ctx.input.whisperHash);

    return {
      output,
      message: `Retrieved extraction details for **${output.whisperHash}**.`
    };
  })
  .build();
