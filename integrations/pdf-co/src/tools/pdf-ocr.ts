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

export let pdfOcr = SlateTool.create(spec, {
  name: 'PDF OCR',
  key: 'pdf_ocr',
  description: `Make a PDF text-searchable using OCR, or make it non-searchable by removing the text layer.
Use "searchable" mode to apply OCR to scanned PDFs so text can be selected and searched. Use "unsearchable" mode to flatten the text layer.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sourceUrl: z.string().describe('URL of the PDF file to process'),
      mode: z
        .enum(['searchable', 'unsearchable'])
        .describe('Whether to make the PDF searchable or non-searchable'),
      lang: z
        .string()
        .optional()
        .describe('OCR language code for searchable mode, e.g. "eng", "fra", "deu"'),
      pages: z.string().optional().describe('Page indices to process, e.g. "0,1,2" or "0-5"'),
      password: z.string().optional().describe('Password for protected PDF files'),
      outputFileName: z.string().optional().describe('Name for the output file')
    })
  )
  .output(
    z.object({
      ...fileAttachmentOutputFields,
      pageCount: z.number().describe('Number of pages in the output PDF'),
      creditsUsed: z.number().describe('API credits consumed'),
      remainingCredits: z.number().describe('Credits remaining on the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result: any;

    if (ctx.input.mode === 'searchable') {
      result = await client.makePdfSearchable({
        url: ctx.input.sourceUrl,
        lang: ctx.input.lang,
        pages: ctx.input.pages,
        password: ctx.input.password,
        name: ctx.input.outputFileName
      });
    } else {
      result = await client.makePdfUnsearchable({
        url: ctx.input.sourceUrl,
        pages: ctx.input.pages,
        password: ctx.input.password,
        name: ctx.input.outputFileName
      });
    }

    if (result.error) {
      throw pdfCoApiError('OCR operation failed', result);
    }
    let file = await downloadPdfCoOutput(client, result, 'application/pdf');

    return {
      output: toFileOutput(result, file),
      attachments: [createPdfCoAttachment(file)],
      message: `Made PDF **${ctx.input.mode}** — ${result.pageCount} page(s), returned as an attachment.`
    };
  })
  .build();
