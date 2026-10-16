import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let orderTranscription = SlateTool.create(spec, {
  name: 'Order Transcription',
  key: 'order_transcription',
  description: `Submit audio or video files for human-powered transcription. Provide one or more media URLs along with a transcription tier and optional add-ons. All selected SKUs apply to every submitted URL.

**Transcription tiers:**
- \`TRANS14\` — Budget (target 14 days)
- \`TRANS6\` — 6 Day
- \`TRANS2\` — 1 Day Expert
- \`EMSR02\` — Advanced Machine Transcription

**Add-ons:** \`DIFFQ2\` (Difficult Audio), \`TSTMP1\` (Timestamps), \`CAPTION1\` (Captions), \`VERBATIM1\` (Verbatim)`,
  instructions: [
    'At least one media URL is required. All URLs must be publicly accessible.',
    'At least one SKU (transcription tier) should be specified. Add-on SKUs can be combined with a tier SKU.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      mediaUrls: z
        .array(z.string())
        .min(1)
        .describe('One or more publicly accessible URLs to audio or video files'),
      skus: z
        .array(z.string())
        .optional()
        .describe(
          'Product SKU codes for transcription tier and add-ons (e.g. ["TRANS2", "TSTMP1"])'
        ),
      notes: z.string().optional().describe('Instructions or comments for the transcriber'),
      speakerNames: z.array(z.string()).optional().describe('Names of speakers in the audio'),
      test: z
        .boolean()
        .optional()
        .describe('Set to true to create a test order that will not be transcribed')
    })
  )
  .output(
    z.object({
      audiofileIds: z.array(z.number()).describe('IDs of the created audiofiles'),
      orderId: z.string().describe('ID of the created order'),
      message: z.string().optional().describe('Response message from CastingWords'),
      hold: z
        .string()
        .optional()
        .describe('Reason the accepted order is on hold, when reported'),
      raw: z.unknown().describe('Provider response with credentials removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let { result, raw } = await client.orderTranscription({
      urls: ctx.input.mediaUrls,
      skus: ctx.input.skus,
      notes: ctx.input.notes,
      speakerNames: ctx.input.speakerNames,
      test: ctx.input.test
    });

    let output = {
      audiofileIds: result.audiofiles,
      orderId: result.order,
      message: result.message,
      hold: result.hold,
      raw
    };

    let urlCount = ctx.input.mediaUrls.length;
    let skuList = ctx.input.skus?.join(', ') || 'default';
    let testLabel = ctx.input.test ? ' (test mode)' : '';
    let holdLabel = output.hold
      ? ` Order is on hold (${output.hold}); transcription has not started.`
      : '';

    return {
      output,
      message: `Ordered transcription${testLabel} for **${urlCount}** file(s) with SKUs: ${client.sanitize(skuList)}. Order ID: **${output.orderId}**, Audiofile IDs: ${output.audiofileIds.join(', ')}.${holdLabel}`
    };
  })
  .build();
