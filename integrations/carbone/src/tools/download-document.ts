import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let downloadDocument = SlateTool.create(spec, {
  name: 'Download Document',
  key: 'download_document',
  description:
    'Download a generated Carbone report using the render ID from render_document or a completion webhook.',
  instructions: [
    'For asynchronous renders, wait for the completion webhook before requesting a download.',
    'Reports expire 1 hour after generation and can be downloaded only once. An expired or already downloaded report cannot be renewed; generate a new report if needed.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      renderId: z
        .string()
        .min(1)
        .describe('Render ID returned by render_document or a completed render webhook.')
    })
  )
  .output(
    z.object({
      renderId: z.string().describe('Requested report render ID.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      carboneVersion: ctx.config.carboneVersion
    });
    await ctx.addAttachment({
      type: 'url',
      ...client.getDownloadDetails('render', ctx.input.renderId)
    });
    return {
      output: { renderId: ctx.input.renderId },
      message: `Prepared report **${ctx.input.renderId}** for download. Download promptly; reports expire after 1 hour and can be downloaded once.`
    };
  })
  .build();
