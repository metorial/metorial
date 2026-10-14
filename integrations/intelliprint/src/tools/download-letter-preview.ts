import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { previewAttachment } from './get-file-url';

export let downloadLetterPreview = SlateTool.create(spec, {
  name: 'Download Letter Preview',
  key: 'download_letter_preview',
  description:
    'Download the PDF preview of one letter or postcard in a print job. Call get_print_job to discover its letter IDs. Previews are unavailable after the provider deletes the PDF.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      printJobId: z
        .string()
        .describe('Print job ID returned by create_print_job or list_print_jobs'),
      letterId: z.string().describe('Letter ID from the letters returned by get_print_job')
    })
  )
  .output(
    z.object({
      printJobId: z.string(),
      letterId: z.string(),
      mimeType: z.literal('application/pdf')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let job = await client.getPrintJob(ctx.input.printJobId);
    let letter = job.letters?.find((item: { id: string }) => item.id === ctx.input.letterId);
    if (!letter) {
      throw createApiServiceError(
        'This letter was not found in the print job. Call get_print_job to find its letter IDs.'
      );
    }
    if (!letter.pdf) {
      throw createApiServiceError(
        'Intelliprint has no PDF preview available for this mail item. The PDF may have been deleted.'
      );
    }
    await ctx.addAttachment(
      previewAttachment(letter.pdf, {
        type: 'letter',
        printJobId: ctx.input.printJobId,
        letterId: ctx.input.letterId
      })
    );
    return {
      output: {
        printJobId: ctx.input.printJobId,
        letterId: ctx.input.letterId,
        mimeType: 'application/pdf' as const
      },
      message: `Prepared the PDF preview for **${ctx.input.letterId}** for download.`
    };
  })
  .build();
