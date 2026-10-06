import { SlateTool } from 'slates';
import { z } from 'zod';
import { downloadDocument } from '../lib/files';
import { spec } from '../spec';
export let downloadShippingDocument = SlateTool.create(spec, {
  name: 'Download Shipping Document',
  key: 'download_document',
  description:
    'Download an existing transaction label or commercial invoice, manifest document, or merged batch label file. This tool does not buy a label or create a manifest.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      kind: z.enum(['transaction', 'manifest', 'batch']),
      resourceId: z.string(),
      documentType: z.enum(['label', 'commercial_invoice', 'manifest', 'batch_labels']),
      documentIndex: z
        .number()
        .optional()
        .describe(
          'Zero-based manifest or batch document index, default 0; transaction index must be 0.'
        )
    })
  )
  .output(
    z.object({
      resourceId: z.string(),
      fileName: z.string(),
      mimeType: z.string(),
      size: z.number()
    })
  )
  .handleInvocation(async ctx => {
    const { bytes, ...output } = await downloadDocument(ctx.auth, ctx.input);
    await ctx.addAttachment({
      type: 'content',
      content: bytes,
      filename: output.fileName,
      mimeType: output.mimeType
    });
    return { output, message: `Prepared ${output.fileName} for download.` };
  })
  .build();
