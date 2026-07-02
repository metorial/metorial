import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pdf4meServiceError } from '../lib/errors';
import { spec } from '../spec';
import {
  fileAttachment,
  fileAttachmentOutputSchema,
  fileOutput,
  type Pdf4meFileResult
} from './shared';

export let mergePdfs = SlateTool.create(spec, {
  name: 'Merge PDFs',
  key: 'merge_pdfs',
  description: `Merge multiple PDF files into a single PDF document. Files are merged in the order provided.
Also supports overlaying one PDF on another (e.g. adding a letterhead or watermark layer).`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      mode: z
        .enum(['merge', 'overlay'])
        .default('merge')
        .describe(
          '"merge" combines PDFs sequentially, "overlay" places one PDF on top of another'
        ),
      documents: z
        .array(z.string())
        .optional()
        .describe('Array of base64-encoded PDF file contents to merge (for "merge" mode)'),
      outputFileName: z.string().describe('Desired output file name (e.g. "merged.pdf")'),
      baseFileContent: z
        .string()
        .optional()
        .describe('Base64-encoded base PDF content (for "overlay" mode)'),
      baseFileName: z.string().optional().describe('Base PDF file name (for "overlay" mode)'),
      layerFileContent: z
        .string()
        .optional()
        .describe('Base64-encoded overlay/layer PDF content (for "overlay" mode)'),
      layerFileName: z
        .string()
        .optional()
        .describe('Overlay/layer PDF file name (for "overlay" mode)')
    })
  )
  .output(fileAttachmentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: Pdf4meFileResult;

    if (ctx.input.mode === 'overlay') {
      if (
        !ctx.input.baseFileContent ||
        !ctx.input.baseFileName ||
        !ctx.input.layerFileContent ||
        !ctx.input.layerFileName
      ) {
        throw pdf4meServiceError(
          'Base and layer file content and names are required for overlay mode'
        );
      }
      result = await client.mergeOverlay({
        baseDocContent: ctx.input.baseFileContent,
        baseDocName: ctx.input.baseFileName,
        layerDocContent: ctx.input.layerFileContent,
        layerDocName: ctx.input.layerFileName
      });
    } else {
      if (!ctx.input.documents || ctx.input.documents.length < 2) {
        throw pdf4meServiceError('At least 2 documents are required for merge');
      }
      result = await client.merge({
        docContent: ctx.input.documents,
        docName: ctx.input.outputFileName
      });
    }

    return {
      output: fileOutput(result, 'application/pdf'),
      attachments: [fileAttachment(result, 'application/pdf')],
      message:
        ctx.input.mode === 'overlay'
          ? `Successfully overlaid PDFs: **${result.fileName}**`
          : `Successfully merged ${ctx.input.documents?.length ?? 0} PDFs into **${result.fileName}**`
    };
  })
  .build();
