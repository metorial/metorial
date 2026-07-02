import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getExtractionStatus = SlateTool.create(spec, {
  name: 'Get Extraction Status',
  key: 'get_extraction_status',
  description: `Check the processing status of a document extraction job. Use the whisper hash returned from **Extract Document** to poll for completion.
Possible statuses: "accepted" (queued), "processing" (in progress), "processed" (ready to retrieve), "error" (failed), "retrieved" (already retrieved).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      whisperHash: z
        .string()
        .describe('The whisper hash returned from the extract document operation.')
    })
  )
  .output(
    z.object({
      status: z
        .string()
        .describe(
          'Current job status: "accepted", "processing", "processed", "error", or "retrieved".'
        ),
      message: z.string().describe('Human-readable status message.'),
      pageDetails: z
        .array(
          z.object({
            pageNo: z.number().describe('Page number.'),
            message: z.string().describe('Status message for this page.'),
            executionTimeInSeconds: z
              .number()
              .describe('Processing time for this page in seconds.')
          })
        )
        .describe('Per-page processing details.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.getWhisperStatus(ctx.input.whisperHash);

    return {
      output: {
        status: result.status,
        message: result.message,
        pageDetails: result.detail
      },
      message: `Extraction status: **${result.status}**. ${result.message}`
    };
  })
  .build();
