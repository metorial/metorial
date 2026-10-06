import { SlateTool } from 'slates';
import { z } from 'zod';
import { BannerbearClient } from '../lib/client';
import { nativeState, nullableText, stateMessage, uid } from '../lib/contracts';
import { deliverGeneratedFiles } from '../lib/results';
import { projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let joinPdfs = SlateTool.create(spec, {
  name: 'Join PDFs',
  key: 'join_pdfs',
  description: `Combine multiple PDF files into a single merged PDF document. Provide URLs to the source PDFs and receive a single combined PDF.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: projectIdSchema,
      pdfUrls: z.array(z.string()).describe('List of URLs to PDF files to join, in order'),
      webhookUrl: z
        .string()
        .optional()
        .describe('URL to receive a POST when joining completes'),
      metadata: z.string().optional().describe('Unsupported V2 PDF-join field; omit it')
    })
  )
  .output(
    z.object({
      joinUid: z.string().describe('UID of the PDF join operation'),
      status: z.string().describe('Processing status'),
      joinedPdfUrl: z.string().nullable().describe('URL of the joined PDF file')
    })
  )
  .handleInvocation(async ctx => {
    const client = new BannerbearClient({ ...ctx.auth, projectId: ctx.input.projectId });
    const result = await client.joinPdfs({
      pdf_inputs: ctx.input.pdfUrls,
      webhook_url: ctx.input.webhookUrl,
      metadata: ctx.input.metadata
    });
    const output = {
      joinUid: uid(result.uid),
      status: nativeState(result.status),
      joinedPdfUrl: nullableText(result.joined_pdf_url)
    };
    await deliverGeneratedFiles(ctx, 'joined_pdf', result);
    return {
      output,
      message: `PDF join ${stateMessage(result.status)} (UID: ${output.joinUid}). Read its status with get_resource.`
    };
  })
  .build();
