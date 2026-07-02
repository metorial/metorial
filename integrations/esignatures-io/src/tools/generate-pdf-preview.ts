import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generatePdfPreview = SlateTool.create(spec, {
  name: 'Generate PDF Preview',
  key: 'generate_pdf_preview',
  description: `Generates a PDF preview of a contract before it is signed. The preview is generated asynchronously — a \`contract-pdf-generated\` webhook event will be sent with the PDF URL once ready.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contractId: z.string().describe('ID of the contract to generate a PDF preview for')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the PDF generation request')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress('Requesting PDF preview generation...');

    let result = await client.generatePdfPreview(ctx.input.contractId);

    return {
      output: {
        status: result?.status || 'queued'
      },
      message: `PDF preview generation queued for contract **${ctx.input.contractId}**. A webhook notification will be sent when the PDF is ready.`
    };
  })
  .build();
