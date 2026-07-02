import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelnyxClient } from '../lib/client';
import { spec } from '../spec';

export let sendFax = SlateTool.create(spec, {
  name: 'Send Fax',
  key: 'send_fax',
  description: `Send a fax to a phone number. Requires a fax-enabled connection (Fax Application) and a media file (PDF URL or previously uploaded media name). The fax is processed asynchronously.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      connectionId: z.string().describe('Fax application / connection ID'),
      to: z.string().describe('Recipient fax number in E.164 format'),
      from: z.string().describe('Sender fax number in E.164 format'),
      mediaUrl: z.string().optional().describe('URL of the PDF file to fax'),
      mediaName: z.string().optional().describe('Name of previously uploaded media to fax'),
      fromDisplayName: z.string().optional().describe('Caller ID display name'),
      quality: z
        .enum(['normal', 'high', 'ultra_light', 'ultra_dark'])
        .optional()
        .describe('Fax quality setting'),
      storeMedia: z
        .boolean()
        .optional()
        .describe('Whether to store the fax media for later retrieval')
    })
  )
  .output(
    z.object({
      faxId: z.string().describe('Unique ID of the fax'),
      from: z.string().describe('Sender number'),
      to: z.string().describe('Recipient number'),
      status: z.string().optional().describe('Current fax status'),
      direction: z.string().optional().describe('Fax direction'),
      createdAt: z.string().optional().describe('When the fax was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelnyxClient({ token: ctx.auth.token });

    let result = await client.sendFax({
      connectionId: ctx.input.connectionId,
      to: ctx.input.to,
      from: ctx.input.from,
      mediaUrl: ctx.input.mediaUrl,
      mediaName: ctx.input.mediaName,
      fromDisplayName: ctx.input.fromDisplayName,
      quality: ctx.input.quality,
      storeMedia: ctx.input.storeMedia
    });

    return {
      output: {
        faxId: result.id,
        from: result.from ?? ctx.input.from,
        to: result.to ?? ctx.input.to,
        status: result.status,
        direction: result.direction,
        createdAt: result.created_at
      },
      message: `Fax queued from **${ctx.input.from}** to **${ctx.input.to}**. Fax ID: **${result.id}**, Status: ${result.status ?? 'queued'}.`
    };
  })
  .build();
