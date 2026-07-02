import { SlateTool } from 'slates';
import { z } from 'zod';
import { DetrackClient } from '../lib/client';
import { spec } from '../spec';

export let downloadPodTool = SlateTool.create(spec, {
  name: 'Download Proof of Delivery',
  key: 'download_pod',
  description: `Downloads the Proof of Delivery (POD) PDF or shipping label PDF for a completed job. Returns a download URL for the requested document.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      doNumber: z.string().describe('Delivery order number of the job'),
      date: z.string().describe('Job date in YYYY-MM-DD format'),
      documentType: z
        .enum(['pod', 'shipping_label'])
        .default('pod')
        .describe('Type of document to download — pod or shipping_label')
    })
  )
  .output(
    z.object({
      doNumber: z.string().describe('Delivery order number'),
      date: z.string().describe('Job date'),
      documentType: z.string().describe('Type of document'),
      url: z.string().describe('Download URL for the document')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DetrackClient(ctx.auth.token);

    let result =
      ctx.input.documentType === 'shipping_label'
        ? await client.downloadJobShippingLabel(ctx.input.doNumber, ctx.input.date)
        : await client.downloadJobPod(ctx.input.doNumber, ctx.input.date);

    return {
      output: {
        doNumber: ctx.input.doNumber,
        date: ctx.input.date,
        documentType: ctx.input.documentType,
        url: result.url ?? ''
      },
      message: `Generated ${ctx.input.documentType === 'shipping_label' ? 'shipping label' : 'POD'} download link for job **${ctx.input.doNumber}**.`
    };
  })
  .build();
