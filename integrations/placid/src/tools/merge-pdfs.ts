import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlacidClient } from '../lib/client';
import { spec } from '../spec';

let transferSchema = z
  .object({
    to: z.literal('s3').describe('Storage provider (currently only "s3" is supported)'),
    key: z.string().describe('AWS access key'),
    secret: z.string().describe('AWS secret key'),
    region: z.string().describe('AWS region name'),
    bucket: z.string().describe('S3 bucket name'),
    visibility: z.enum(['public', 'private']).optional().describe('File visibility'),
    path: z.string().optional().describe('Full file path including filename and extension'),
    endpoint: z.string().optional().describe('Custom S3-compatible endpoint URL'),
    token: z.string().optional().describe('AWS STS session token')
  })
  .optional()
  .describe('Transfer merged PDF to S3-compatible storage');

export let mergePdfs = SlateTool.create(spec, {
  name: 'Merge PDFs',
  key: 'merge_pdfs',
  description: `Merge multiple existing PDF files into a single PDF document. Useful for combining static PDFs (e.g., cover pages) with Placid-generated content. The merged PDF can be transferred to S3-compatible storage.`,
  constraints: ['Accepts 2-10 PDF URLs.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      pdfUrls: z
        .array(z.string())
        .min(2)
        .max(10)
        .describe('URLs of PDF files to merge (2-10)'),
      webhookUrl: z
        .string()
        .optional()
        .describe('URL to receive a POST notification when merge completes'),
      passthrough: z
        .string()
        .optional()
        .describe('Custom reference data returned in the webhook payload (max 1024 chars)'),
      transfer: transferSchema
    })
  )
  .output(
    z.object({
      pdfId: z.number().describe('Unique ID of the merged PDF'),
      status: z.string().describe('Generation status: queued, finished, or error'),
      pdfUrl: z.string().nullable().describe('URL of the merged PDF (null if still queued)'),
      pollingUrl: z.string().describe('URL to poll for status updates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlacidClient({ token: ctx.auth.token });

    let result = await client.mergePdfs({
      urls: ctx.input.pdfUrls,
      webhookSuccess: ctx.input.webhookUrl,
      passthrough: ctx.input.passthrough,
      transfer: ctx.input.transfer
    });

    return {
      output: {
        pdfId: result.id,
        status: result.status,
        pdfUrl: result.pdf_url,
        pollingUrl: result.polling_url
      },
      message:
        result.status === 'finished'
          ? `Merged **${ctx.input.pdfUrls.length}** PDFs into PDF **#${result.id}**. [View PDF](${result.pdf_url})`
          : `Merging **${ctx.input.pdfUrls.length}** PDFs into PDF **#${result.id}**. Status: **${result.status}**. Poll \`${result.polling_url}\` for updates.`
    };
  })
  .build();
