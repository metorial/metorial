import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pdfCoApiError } from '../lib/errors';
import { spec } from '../spec';
import {
  createPdfCoAttachment,
  downloadPdfCoOutput,
  fileAttachmentOutputFields,
  toFileOutput
} from './shared';

export let mergePdf = SlateTool.create(spec, {
  name: 'Merge Documents',
  key: 'merge_documents',
  description: `Merge multiple documents into a single PDF file. Source documents can be PDFs, DOC, text, Excel, images, or ZIP archives containing documents.
Provide multiple file URLs separated by commas. All documents will be combined into one PDF in the order specified.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sourceUrls: z
        .string()
        .describe('Comma-separated URLs of the source files to merge into a single PDF'),
      outputFileName: z.string().optional().describe('Name for the merged output PDF file')
    })
  )
  .output(
    z.object({
      ...fileAttachmentOutputFields,
      pageCount: z.number().describe('Total pages in the merged PDF'),
      creditsUsed: z.number().describe('API credits consumed'),
      remainingCredits: z.number().describe('Credits remaining on the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.mergePdfs({
      url: ctx.input.sourceUrls,
      name: ctx.input.outputFileName
    });

    if (result.error) {
      throw pdfCoApiError('Merge failed', result);
    }
    let file = await downloadPdfCoOutput(client, result, 'application/pdf');

    return {
      output: toFileOutput(result, file),
      attachments: [createPdfCoAttachment(file)],
      message: `Merged documents into a single PDF — ${result.pageCount} page(s), returned as an attachment.`
    };
  })
  .build();
