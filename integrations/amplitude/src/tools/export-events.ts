import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { createAmplitudeClient } from '../lib/client';
import { spec } from '../spec';

export let exportEventsTool = SlateTool.create(spec, {
  name: 'Export Events',
  key: 'export_events',
  description: `Export Amplitude raw event files for an uploaded-time range as a downloadable ZIP file. Use this for archival, warehouse backfills, or offline inspection of raw JSON event exports.`,
  constraints: [
    'The Export API returns data by server upload time, not event time.',
    'Data may take up to two hours to become available.',
    'Use whole-day ranges from T00 to T23 when exporting a full day.',
    'Each export may be up to 4 GB and date ranges may not exceed 365 days.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .authMethods(['api_key_secret'])
  .input(
    z.object({
      start: z
        .string()
        .regex(/^\d{8}T\d{2}$/)
        .describe('Start hour in YYYYMMDDTHH format, for example 20260131T00.'),
      end: z
        .string()
        .regex(/^\d{8}T\d{2}$/)
        .describe('End hour in YYYYMMDDTHH format, for example 20260131T23.')
    })
  )
  .output(
    z.object({
      contentType: z.string().describe('MIME type of the exported file.'),
      byteLength: z.number().describe('Size of the exported ZIP file in bytes.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createAmplitudeClient(ctx);

    let result = await client.exportEvents({
      start: ctx.input.start,
      end: ctx.input.end
    });

    return {
      output: {
        contentType: result.contentType,
        byteLength: result.byteLength
      },
      attachments: [createBase64Attachment(result.contentBase64, result.contentType)],
      message: `Exported Amplitude events from ${ctx.input.start} to ${ctx.input.end} as a downloadable ZIP file.`
    };
  })
  .build();
