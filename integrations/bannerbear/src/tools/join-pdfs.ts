import { SlateTool } from 'slates';
import { z } from 'zod';
import { BannerbearClient } from '../lib/client';
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
      pdfUrls: z.array(z.string()).describe('List of URLs to PDF files to join, in order'),
      webhookUrl: z
        .string()
        .optional()
        .describe('URL to receive a POST when joining completes'),
      metadata: z.string().optional().describe('Custom metadata to attach')
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
    let client = new BannerbearClient({ token: ctx.auth.token });

    let result = await client.joinPdfs({
      pdf_inputs: ctx.input.pdfUrls,
      webhook_url: ctx.input.webhookUrl,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        joinUid: result.uid,
        status: result.status,
        joinedPdfUrl: result.joined_pdf_url || null
      },
      message: `PDF join ${result.status === 'completed' ? 'completed' : 'initiated'} (UID: ${result.uid}) combining ${ctx.input.pdfUrls.length} PDFs. ${result.joined_pdf_url ? `[Download PDF](${result.joined_pdf_url})` : 'Still processing.'}`
    };
  })
  .build();
